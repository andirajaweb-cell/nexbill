import { db } from "@/db/client";
import { bookings, outlets, rentalSessions, promos } from "@/db/schema";
import { eq, and, inArray, isNotNull } from "drizzle-orm";
import { logAudit } from "@/lib/audit/log";
import { hasConflict } from "./bookings";
import { queueBookingNotification, bookingMessages, outletName, BookingNotificationType } from "./notifications";
import { runHomeRentalScheduler } from "@/lib/home-rental/scheduler";

/**
 * Background sweep for the Reservation Engine — auto-release, waitlist
 * promotion, and time-based reminders. This codebase has no server-side cron
 * of any kind (single Next.js process via `next start`), so these functions
 * are meant to be called periodically by something external: either the
 * standalone scripts/booking-scheduler.ts poller (npm run scheduler, mirrors
 * the existing scripts/whatsapp-bot.ts pattern) or any external cron hitting
 * POST /api/bookings/scheduler/run. Pure DB logic — works whether or not the
 * WhatsApp bot is connected; only the actual message delivery depends on
 * that separate process (see notifications.ts).
 */

const MINUTE = 60000;

async function listOutlets(outletId?: string) {
  return outletId ? db.select().from(outlets).where(eq(outlets.id, outletId)) : db.select().from(outlets);
}

async function tryPromote(outletId: string, candidate: typeof bookings.$inferSelect) {
  const conflict = await hasConflict(outletId, candidate, candidate.scheduledStart, candidate.scheduledEnd, 0, candidate.id);
  if (conflict) return null;

  const autoConfirmed = !(candidate.dpAmount && candidate.dpAmount > 0);
  const now = new Date().toISOString();
  const [promoted] = await db
    .update(bookings)
    .set({ status: autoConfirmed ? "confirmed" : "pending", confirmedAt: autoConfirmed ? now : null, waitlistPosition: null })
    .where(eq(bookings.id, candidate.id))
    .returning();

  await logAudit({
    outletId,
    action: "promote_booking_from_waitlist",
    entityType: "booking",
    entityId: candidate.id,
    before: { status: "waitlisted" },
    after: { status: promoted.status },
  });

  if (promoted.bookingCode) {
    const name = await outletName(outletId);
    await queueBookingNotification({
      bookingId: promoted.id,
      outletId,
      type: "waitlist_available",
      phone: promoted.phone,
      message: bookingMessages.waitlistAvailable(promoted.bookingCode, name, promoted.scheduledStart),
    });
  }
  return promoted;
}

/**
 * Marks bookings that blew past their check-in grace window: never-confirmed
 * ("pending") bookings become "expired", confirmed-but-not-checked-in
 * bookings become "no_show" — each outlet's own bookingAutoReleaseMinutes
 * setting controls the grace period. Immediately tries to promote a matching
 * waitlisted booking into the freed slot for snappier turnaround than
 * waiting for the next full waitlist sweep.
 */
export async function runAutoRelease(outletId?: string) {
  const released: { bookingId: string; bookingCode: string | null; newStatus: string }[] = [];
  const outletRows = await listOutlets(outletId);

  for (const outlet of outletRows) {
    const cutoff = new Date(Date.now() - outlet.bookingAutoReleaseMinutes * MINUTE).toISOString();
    const stale = await db.select().from(bookings).where(and(eq(bookings.outletId, outlet.id), inArray(bookings.status, ["pending", "confirmed"] as any)));

    for (const b of stale) {
      if (b.scheduledStart > cutoff) continue; // grace period hasn't elapsed yet
      const newStatus = b.status === "pending" ? "expired" : "no_show";
      const now = new Date().toISOString();
      await db
        .update(bookings)
        .set(newStatus === "expired" ? { status: "expired", expiredAt: now } : { status: "no_show", noShowAt: now })
        .where(eq(bookings.id, b.id));
      await logAudit({
        outletId: outlet.id,
        action: newStatus === "expired" ? "auto_expire_booking" : "auto_no_show_booking",
        entityType: "booking",
        entityId: b.id,
        before: { status: b.status },
        after: { status: newStatus, reason: `Tidak check-in dalam ${outlet.bookingAutoReleaseMinutes} menit setelah jadwal mulai` },
      });
      released.push({ bookingId: b.id, bookingCode: b.bookingCode, newStatus });

      // Look for the earliest waitlisted booking that could use this unit/type now that it's free.
      const candidates = await db.select().from(bookings).where(and(eq(bookings.outletId, outlet.id), eq(bookings.status, "waitlisted")));
      const relevant = candidates
        .filter((c) => (b.rentalUnitId ? c.rentalUnitId === b.rentalUnitId || (!c.rentalUnitId && c.consoleType === b.consoleType) : c.consoleType === b.consoleType))
        .sort((a, c) => (a.waitlistPosition ?? 0) - (c.waitlistPosition ?? 0));
      for (const candidate of relevant) {
        if (await tryPromote(outlet.id, candidate)) break;
      }
    }
  }

  return released;
}

/** Periodic catch-all — re-checks every waitlisted booking regardless of what triggered the opening (a new unit added, an unrelated reschedule, etc), independent of runAutoRelease's immediate per-slot attempt. */
export async function runWaitlistSweep(outletId?: string) {
  const promotedIds: string[] = [];
  const outletRows = await listOutlets(outletId);
  for (const outlet of outletRows) {
    const waitlisted = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.outletId, outlet.id), eq(bookings.status, "waitlisted")))
      .orderBy(bookings.waitlistPosition);
    for (const candidate of waitlisted) {
      const promoted = await tryPromote(outlet.id, candidate);
      if (promoted) promotedIds.push(promoted.id);
    }
  }
  return promotedIds;
}

const REMINDER_WINDOWS: { type: BookingNotificationType; minutesBefore: number; toleranceMinutes: number; render: (code: string, name: string, start: string) => string }[] = [
  { type: "reminder_h24", minutesBefore: 1440, toleranceMinutes: 15, render: bookingMessages.reminderH24 },
  { type: "reminder_h2", minutesBefore: 120, toleranceMinutes: 10, render: bookingMessages.reminderH2 },
  { type: "reminder_15m", minutesBefore: 15, toleranceMinutes: 5, render: bookingMessages.reminderM15 },
];

/** Queues H-24/H-2/15-minute reminders for upcoming pending/confirmed bookings — each window only fires once per booking (dedup lives in queueBookingNotification) within a tolerance wide enough that a ~1-minute poll interval never misses it. */
export async function runReminders(outletId?: string) {
  const queued: string[] = [];
  const outletRows = await listOutlets(outletId);
  for (const outlet of outletRows) {
    const upcoming = await db.select().from(bookings).where(and(eq(bookings.outletId, outlet.id), inArray(bookings.status, ["pending", "confirmed"] as any)));
    if (upcoming.length === 0) continue;
    const name = await outletName(outlet.id);

    for (const b of upcoming) {
      if (!b.phone || !b.bookingCode) continue;
      const minutesUntil = (new Date(b.scheduledStart).getTime() - Date.now()) / MINUTE;
      for (const w of REMINDER_WINDOWS) {
        if (minutesUntil <= w.minutesBefore && minutesUntil > w.minutesBefore - w.toleranceMinutes) {
          const row = await queueBookingNotification({ bookingId: b.id, outletId: outlet.id, type: w.type, phone: b.phone, message: w.render(b.bookingCode, name, b.scheduledStart) });
          if (row) queued.push(row.id);
        }
      }
    }
  }
  return queued;
}

// Warning band for "your play time is almost up" — mirrors REMINDER_WINDOWS' tolerance-band
// trick: only fires once because a ~60s poll interval only catches remainingMinutes passing
// through this narrow band once per session, not because of any "already sent" bookkeeping.
const SESSION_WARNING_MINUTES_BEFORE = 15;
const SESSION_WARNING_TOLERANCE_MINUTES = 3;

/**
 * Tells the CUSTOMER (not just staff watching the dashboard) their play time is almost up —
 * only possible for sessions that came from a booking (checkInBooking sets session.bookingId),
 * since that's the only place a phone number + consent to message them exists. A walk-in
 * session started straight from the kasir with no booking has no phone on file, so it can
 * only ever be tracked from the dashboard countdown, not via WhatsApp — this is a deliberate
 * scope limit, not an oversight.
 */
export async function runSessionTimeWarning(outletId?: string) {
  const queued: string[] = [];
  const outletRows = await listOutlets(outletId);

  for (const outlet of outletRows) {
    const active = await db
      .select()
      .from(rentalSessions)
      .where(and(eq(rentalSessions.outletId, outlet.id), inArray(rentalSessions.status, ["running", "paused"] as any), isNotNull(rentalSessions.bookingId)));
    if (active.length === 0) continue;

    const promoIds = [...new Set(active.map((s) => s.promoId).filter((id): id is string => !!id))];
    const promoRows = promoIds.length ? await db.select().from(promos).where(inArray(promos.id, promoIds)) : [];
    const promoById = new Map(promoRows.map((p) => [p.id, p]));
    const name = await outletName(outlet.id);

    for (const session of active) {
      const promo = session.promoId ? promoById.get(session.promoId) : null;
      const allowedMinutes = promo?.durationMinutes ?? session.plannedMinutes;
      if (allowedMinutes === null || allowedMinutes === undefined) continue; // open-ended session — no "remaining" to warn about

      let effectivePauseMs = session.accumulatedPauseMs;
      if (session.status === "paused" && session.pausedAt) effectivePauseMs += Date.now() - new Date(session.pausedAt).getTime();
      const elapsedMinutes = Math.max(0, (Date.now() - new Date(session.startedAt).getTime() - effectivePauseMs) / MINUTE);
      const remainingMinutes = allowedMinutes + session.extendedMinutes - elapsedMinutes;

      if (remainingMinutes > SESSION_WARNING_MINUTES_BEFORE || remainingMinutes <= SESSION_WARNING_MINUTES_BEFORE - SESSION_WARNING_TOLERANCE_MINUTES) continue;

      const [booking] = await db.select().from(bookings).where(eq(bookings.id, session.bookingId!)).limit(1);
      if (!booking?.phone || !booking.bookingCode) continue;

      const row = await queueBookingNotification({
        bookingId: booking.id,
        outletId: outlet.id,
        type: "session_time_warning",
        phone: booking.phone,
        message: bookingMessages.sessionTimeWarning(booking.bookingCode, name, remainingMinutes),
      });
      if (row) queued.push(row.id);
    }
  }
  return queued;
}

/**
 * Runs the full sweep in order — release-then-promote-then-remind — once per poll tick. Also
 * chains the Home Rental reminder sweep (pickup H-24/H-2, due-today, repeating overdue) here
 * rather than standing up a second external poller process — both scripts/booking-scheduler.ts
 * and POST /api/bookings/scheduler/run automatically cover Home Rental for free this way.
 */
export async function runBookingScheduler(outletId?: string) {
  const released = await runAutoRelease(outletId);
  const promoted = await runWaitlistSweep(outletId);
  const remindersQueued = await runReminders(outletId);
  const sessionWarningsQueued = await runSessionTimeWarning(outletId);
  const homeRental = await runHomeRentalScheduler(outletId);
  return {
    released,
    promoted,
    remindersQueued,
    sessionWarningsQueued,
    homeRentalPickupRemindersQueued: homeRental.pickupRemindersQueued,
    homeRentalReturnRemindersQueued: homeRental.returnRemindersQueued,
    ranAt: new Date().toISOString(),
  };
}
