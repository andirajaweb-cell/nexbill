import { db } from "@/db/client";
import { bookings, rentalUnits, outlets, rentalSessions, promos } from "@/db/schema";
import { eq, and, inArray, ne, sql, isNull } from "drizzle-orm";
import { startRentalSession } from "./sessions";
import { logAudit } from "@/lib/audit/log";
import { queueBookingNotification, bookingMessages, outletName } from "./notifications";

export interface CreateBookingInput {
  outletId: string;
  rentalUnitId?: string | null;
  consoleType?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  phone?: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  dpAmount?: number;
  notes?: string | null;
  source?: "kasir" | "online" | "whatsapp";
  staffUserId?: string | null;
}

const ACTIVE_STATUSES = ["pending", "confirmed", "checked_in"] as const;

/** True if [aStart,aEnd) overlaps [bStart,bEnd). */
function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && bStart < aEnd;
}

/** Widens [start,end) by bufferMinutes on both sides for overlap purposes — enforces a cleaning/reset gap between back-to-back bookings on the same unit. */
function withBuffer(start: string, end: string, bufferMinutes: number) {
  if (!bufferMinutes) return { start, end };
  return {
    start: new Date(new Date(start).getTime() - bufferMinutes * 60000).toISOString(),
    end: new Date(new Date(end).getTime() + bufferMinutes * 60000).toISOString(),
  };
}

async function generateBookingCode(outletId: string): Promise<string> {
  const [{ count }] = (await db
    .select({ count: sql<number>`count(*)` })
    .from(bookings)
    .where(eq(bookings.outletId, outletId))) as { count: number }[];
  return `BK-${String(count + 1).padStart(5, "0")}`;
}

/** Open-ended sessions (no plannedMinutes/promo duration) have no knowable end — cap the conflict window at a generous horizon rather than blocking forever. Mirrors the hours-param clamp in /api/public/availability-timeline. */
const OPEN_ENDED_SESSION_BLOCK_HOURS = 24;

/**
 * If `unitId` currently has a running/paused rental session, returns the window it's expected
 * to occupy the unit for. This is what makes hasConflict() actually block a booking over a unit
 * that's "sedang bermain" right now — without this, hasConflict() only ever looked at the
 * bookings table, so a live session with zero rows in `bookings` was completely invisible to it
 * and /api/public/check-availability would wrongly report the unit as available. Mirrors the
 * effective-remaining-time computation already used in /api/public/availability-timeline.
 */
async function getActiveSessionBusyWindow(unitId: string): Promise<{ start: string; end: string } | null> {
  const [session] = await db
    .select()
    .from(rentalSessions)
    .where(and(eq(rentalSessions.rentalUnitId, unitId), inArray(rentalSessions.status, ["running", "paused"])))
    .limit(1);
  if (!session) return null;

  const nowMs = Date.now();
  let effectivePauseMs = session.accumulatedPauseMs;
  if (session.status === "paused" && session.pausedAt) effectivePauseMs += nowMs - new Date(session.pausedAt).getTime();
  const elapsedMinutes = Math.max(0, (nowMs - new Date(session.startedAt).getTime() - effectivePauseMs) / 60000);

  let plannedMinutes = session.plannedMinutes;
  if (session.promoId) {
    const [promo] = await db.select().from(promos).where(eq(promos.id, session.promoId)).limit(1);
    if (promo?.durationMinutes != null) plannedMinutes = promo.durationMinutes;
  }
  const allowedMinutes = plannedMinutes != null ? plannedMinutes + session.extendedMinutes : null;

  if (allowedMinutes != null) {
    const remainingMinutes = Math.max(0, allowedMinutes - elapsedMinutes);
    return { start: new Date(nowMs).toISOString(), end: new Date(nowMs + remainingMinutes * 60000).toISOString() };
  }
  // Open-ended session — we genuinely don't know when it'll stop, so cap conservatively.
  return { start: new Date(nowMs).toISOString(), end: new Date(nowMs + OPEN_ENDED_SESSION_BLOCK_HOURS * 3600000).toISOString() };
}

/**
 * Shared conflict check for both createBooking and rescheduleBooking.
 *
 * - Specific unit requested: conflicts with any other active booking pinned
 *   to that exact unit whose (buffered) window overlaps, AND ALSO conflicts
 *   if a "floating" console-type-only booking ("any PS4") for the same
 *   console type would, once every OTHER unit of that type is accounted for,
 *   have nowhere left to go but this exact unit — otherwise a specific-unit
 *   request could silently double-book a unit that's already implicitly
 *   claimed by an "any PS4" booking (this was a real gap: the old code only
 *   ever looked at bookings.rentalUnitId literally equal to the target unit,
 *   so a floating booking with rentalUnitId=NULL was invisible to it).
 * - Console-type-only ("any PS4"): conflicts only once EVERY matching unit at
 *   this outlet is already claimed for an overlapping window by some other
 *   active booking (whether that other booking pinned a specific unit or was
 *   itself console-type-only) — this is the gap the prior implementation had
 *   (it never checked console-type-only bookings against each other at all).
 */
export async function hasConflict(
  outletId: string,
  target: { rentalUnitId?: string | null; consoleType?: string | null },
  scheduledStart: string,
  scheduledEnd: string,
  bufferMinutes: number,
  excludeBookingId?: string
): Promise<boolean> {
  const { start: bufferedStart, end: bufferedEnd } = withBuffer(scheduledStart, scheduledEnd, bufferMinutes);

  if (target.rentalUnitId) {
    const conditions = [eq(bookings.rentalUnitId, target.rentalUnitId), inArray(bookings.status, ACTIVE_STATUSES as any)];
    if (excludeBookingId) conditions.push(ne(bookings.id, excludeBookingId));
    const existing = await db.select().from(bookings).where(and(...conditions));
    if (existing.some((b) => overlaps(bufferedStart, bufferedEnd, b.scheduledStart, b.scheduledEnd))) return true;

    // Direct check against a currently-running/paused session on this exact unit ("sedang bermain").
    const busyWindow = await getActiveSessionBusyWindow(target.rentalUnitId);
    if (busyWindow && overlaps(bufferedStart, bufferedEnd, busyWindow.start, busyWindow.end)) return true;

    // Indirect check against floating console-type-only bookings of the same console type.
    const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, target.rentalUnitId)).limit(1);
    if (unit) {
      const matchingUnits = await db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.consoleType, unit.consoleType)));
      const floatingConditions = [
        eq(bookings.outletId, outletId),
        eq(bookings.consoleType, unit.consoleType),
        isNull(bookings.rentalUnitId),
        inArray(bookings.status, ACTIVE_STATUSES as any),
      ];
      if (excludeBookingId) floatingConditions.push(ne(bookings.id, excludeBookingId));
      const floating = await db.select().from(bookings).where(and(...floatingConditions));
      const overlappingFloating = floating.filter((b) => overlaps(bufferedStart, bufferedEnd, b.scheduledStart, b.scheduledEnd));

      if (overlappingFloating.length > 0) {
        const otherUnitIds = matchingUnits.filter((u) => u.id !== target.rentalUnitId).map((u) => u.id);
        let pinnedOtherOverlap = 0;
        if (otherUnitIds.length) {
          const pinnedOther = await db.select().from(bookings).where(and(inArray(bookings.rentalUnitId, otherUnitIds), inArray(bookings.status, ACTIVE_STATUSES as any)));
          pinnedOtherOverlap = pinnedOther.filter((b) => overlaps(bufferedStart, bufferedEnd, b.scheduledStart, b.scheduledEnd)).length;
        }
        const freeOtherUnits = otherUnitIds.length - pinnedOtherOverlap;
        // If floating demand exceeds the capacity of every OTHER unit, it must be relying on this exact unit.
        if (overlappingFloating.length > freeOtherUnits) return true;
      }
    }
    return false;
  }

  if (target.consoleType) {
    const matchingUnits = await db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.consoleType, target.consoleType as any)));
    if (matchingUnits.length === 0) throw new Error(`Tidak ada unit ${target.consoleType} terdaftar di cabang ini.`);

    const conditions = [eq(bookings.outletId, outletId), eq(bookings.consoleType, target.consoleType), inArray(bookings.status, ACTIVE_STATUSES as any)];
    if (excludeBookingId) conditions.push(ne(bookings.id, excludeBookingId));
    const existing = await db.select().from(bookings).where(and(...conditions));
    const overlapping = existing.filter((b) => overlaps(bufferedStart, bufferedEnd, b.scheduledStart, b.scheduledEnd));

    // Units tied up by a pinned overlapping booking.
    const busyUnitIds = new Set(overlapping.filter((b) => b.rentalUnitId).map((b) => b.rentalUnitId as string));
    // Floating (unit-not-yet-decided) overlapping bookings — each still consumes one unit's worth of capacity.
    const floatingDemand = overlapping.filter((b) => !b.rentalUnitId).length;

    // Units currently mid-session ("sedang bermain") right now, even with zero rows in `bookings`.
    for (const u of matchingUnits) {
      if (busyUnitIds.has(u.id)) continue;
      const busyWindow = await getActiveSessionBusyWindow(u.id);
      if (busyWindow && overlaps(bufferedStart, bufferedEnd, busyWindow.start, busyWindow.end)) busyUnitIds.add(u.id);
    }

    const capacityUsed = busyUnitIds.size + floatingDemand;
    return capacityUsed >= matchingUnits.length;
  }

  return false;
}

export async function createBooking(input: CreateBookingInput) {
  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, input.outletId)).limit(1);
  if (!outlet) throw new Error("Outlet tidak ditemukan.");

  const source = input.source ?? "kasir";
  if (source !== "kasir" && outlet.bookingMinLeadMinutes > 0) {
    const minutesUntilStart = (new Date(input.scheduledStart).getTime() - Date.now()) / 60000;
    if (minutesUntilStart < outlet.bookingMinLeadMinutes) {
      throw new Error(`Booking online/WhatsApp minimal ${outlet.bookingMinLeadMinutes} menit sebelum waktu mulai — untuk booking mendadak, hubungi kasir langsung.`);
    }
  }
  if (new Date(input.scheduledEnd).getTime() <= new Date(input.scheduledStart).getTime()) {
    throw new Error("Waktu selesai harus setelah waktu mulai.");
  }

  const conflict = await hasConflict(input.outletId, input, input.scheduledStart, input.scheduledEnd, outlet.bookingBufferMinutes);
  const bookingCode = await generateBookingCode(input.outletId);

  if (conflict) {
    const waitlisted = await db.select().from(bookings).where(and(eq(bookings.outletId, input.outletId), eq(bookings.status, "waitlisted")));
    const [row] = await db
      .insert(bookings)
      .values({ ...input, bookingCode, source, status: "waitlisted", waitlistPosition: waitlisted.length + 1 })
      .returning();
    await logAudit({
      outletId: input.outletId,
      staffUserId: input.staffUserId ?? undefined,
      action: "create_booking_waitlisted",
      entityType: "booking",
      entityId: row.id,
      after: { bookingCode, scheduledStart: input.scheduledStart, scheduledEnd: input.scheduledEnd, waitlistPosition: row.waitlistPosition },
    });
    // Only customer-initiated sources need a WA text — a kasir walk-in booking is already
    // being handled face-to-face at the counter, no message needed.
    if (source !== "kasir" && row.bookingCode) {
      const name = await outletName(input.outletId);
      await queueBookingNotification({
        bookingId: row.id, outletId: input.outletId, type: "confirmation", phone: row.phone,
        message: bookingMessages.waitlisted(row.bookingCode, name, input.scheduledStart, row.waitlistPosition ?? 1),
      });
    }
    return { booking: row, waitlisted: true };
  }

  const autoConfirmed = !(input.dpAmount && input.dpAmount > 0);
  const [row] = await db
    .insert(bookings)
    .values({
      ...input,
      bookingCode,
      source,
      status: autoConfirmed ? "confirmed" : "pending",
      confirmedAt: autoConfirmed ? new Date().toISOString() : null,
    })
    .returning();
  await logAudit({
    outletId: input.outletId,
    staffUserId: input.staffUserId ?? undefined,
    action: "create_booking",
    entityType: "booking",
    entityId: row.id,
    after: { bookingCode, status: row.status, scheduledStart: input.scheduledStart, scheduledEnd: input.scheduledEnd, source },
  });
  // Same as above — createBooking() previously only ever inserted the row, so an
  // auto-confirmed or pending-review customer-initiated booking never got a WA message;
  // only the separate confirmBooking() (staff pressing "Confirm" on an already-pending
  // booking) queued one. That left online/whatsapp bookings that skip straight to
  // "confirmed" (no DP required) silently un-notified.
  if (source !== "kasir" && row.bookingCode) {
    const name = await outletName(input.outletId);
    const message = autoConfirmed
      ? bookingMessages.confirmation(row.bookingCode, name, input.scheduledStart)
      : bookingMessages.pendingReview(row.bookingCode, name, input.scheduledStart);
    await queueBookingNotification({ bookingId: row.id, outletId: input.outletId, type: "confirmation", phone: row.phone, message });
  }
  return { booking: row, waitlisted: false };
}

export async function confirmBooking(id: string, staffUserId?: string) {
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!before) throw new Error("Booking tidak ditemukan.");
  if (!["pending", "waitlisted"].includes(before.status)) throw new Error(`Booking berstatus "${before.status}" tidak bisa dikonfirmasi.`);

  const [row] = await db
    .update(bookings)
    .set({ status: "confirmed", confirmedAt: new Date().toISOString(), waitlistPosition: null })
    .where(eq(bookings.id, id))
    .returning();
  await logAudit({ outletId: row.outletId, staffUserId, action: "confirm_booking", entityType: "booking", entityId: id, before: { status: before.status }, after: { status: row.status } });

  if (row.bookingCode) {
    const name = await outletName(row.outletId);
    await queueBookingNotification({ bookingId: row.id, outletId: row.outletId, type: "confirmation", phone: row.phone, message: bookingMessages.confirmation(row.bookingCode, name, row.scheduledStart) });
  }
  return row;
}

export async function cancelBooking(id: string, reason?: string, staffUserId?: string) {
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!before) throw new Error("Booking tidak ditemukan.");
  if (["completed", "cancelled", "no_show", "expired"].includes(before.status)) {
    throw new Error(`Booking berstatus "${before.status}" tidak bisa dibatalkan.`);
  }

  const [row] = await db
    .update(bookings)
    .set({ status: "cancelled", cancelReason: reason, cancelledAt: new Date().toISOString() })
    .where(eq(bookings.id, id))
    .returning();
  await logAudit({ outletId: row.outletId, staffUserId, action: "cancel_booking", entityType: "booking", entityId: id, before: { status: before.status }, after: { status: row.status, reason } });

  if (row.bookingCode) {
    const name = await outletName(row.outletId);
    await queueBookingNotification({ bookingId: row.id, outletId: row.outletId, type: "cancellation", phone: row.phone, message: bookingMessages.cancellation(row.bookingCode, name, reason) });
  }
  return row;
}

export async function markNoShow(id: string, staffUserId?: string) {
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!before) throw new Error("Booking tidak ditemukan.");

  const [row] = await db.update(bookings).set({ status: "no_show", noShowAt: new Date().toISOString() }).where(eq(bookings.id, id)).returning();
  await logAudit({ outletId: row.outletId, staffUserId, action: "mark_booking_no_show", entityType: "booking", entityId: id, before: { status: before.status }, after: { status: row.status } });
  return row;
}

/**
 * Reverts a booking mistakenly (or no longer accurately) marked "no_show" back to
 * "confirmed" — deliberately NOT exposed to the same manage_bookings permission that lets
 * any cashier mark a no-show in the first place (see /api/bookings/[id]/no-show); the API
 * route for this restricts it to superuser only, since undoing a no-show after the
 * fact is a correction that should have oversight rather than being something any cashier
 * can quietly flip back and forth. Always restores to "confirmed" (never "pending" or
 * "waitlisted") since a booking can only reach no_show from an already-confirmed slot.
 */
export async function undoNoShow(id: string, staffUserId?: string) {
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!before) throw new Error("Booking tidak ditemukan.");
  if (before.status !== "no_show") throw new Error(`Booking berstatus "${before.status}", bukan no-show — tidak ada yang perlu dibatalkan.`);

  const [row] = await db.update(bookings).set({ status: "confirmed", noShowAt: null }).where(eq(bookings.id, id)).returning();
  await logAudit({ outletId: row.outletId, staffUserId, action: "undo_booking_no_show", entityType: "booking", entityId: id, before: { status: before.status }, after: { status: row.status } });
  return row;
}

/** Re-checks availability for the new slot (excluding this booking itself) before moving it — old and new schedule are both preserved in the audit log. */
export async function rescheduleBooking(id: string, scheduledStart: string, scheduledEnd: string, staffUserId?: string) {
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!before) throw new Error("Booking tidak ditemukan.");
  if (!["pending", "confirmed"].includes(before.status)) throw new Error(`Booking berstatus "${before.status}" tidak bisa dijadwal ulang.`);
  if (new Date(scheduledEnd).getTime() <= new Date(scheduledStart).getTime()) throw new Error("Waktu selesai harus setelah waktu mulai.");

  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, before.outletId)).limit(1);
  const conflict = await hasConflict(before.outletId, before, scheduledStart, scheduledEnd, outlet?.bookingBufferMinutes ?? 0, id);
  if (conflict) throw new Error("Slot baru bentrok dengan booking lain — pilih waktu atau unit lain.");

  const [row] = await db.update(bookings).set({ scheduledStart, scheduledEnd }).where(eq(bookings.id, id)).returning();
  await logAudit({
    outletId: row.outletId,
    staffUserId,
    action: "reschedule_booking",
    entityType: "booking",
    entityId: id,
    before: { scheduledStart: before.scheduledStart, scheduledEnd: before.scheduledEnd },
    after: { scheduledStart, scheduledEnd },
  });

  if (row.bookingCode) {
    const name = await outletName(row.outletId);
    await queueBookingNotification({ bookingId: row.id, outletId: row.outletId, type: "reschedule", phone: row.phone, message: bookingMessages.reschedule(row.bookingCode, name, scheduledStart) });
  }
  return row;
}

/** Moves a not-yet-checked-in booking to a different unit (e.g. the original broke down) — preserves price/history, just re-points rentalUnitId after confirming the new unit is free for the same window. */
export async function transferBookingUnit(id: string, newRentalUnitId: string, reason?: string, staffUserId?: string) {
  const [before] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!before) throw new Error("Booking tidak ditemukan.");
  if (!["pending", "confirmed"].includes(before.status)) throw new Error(`Booking berstatus "${before.status}" tidak bisa dipindah unit.`);

  const [newUnit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, newRentalUnitId)).limit(1);
  if (!newUnit) throw new Error("Unit tujuan tidak ditemukan.");

  const [outlet] = await db.select().from(outlets).where(eq(outlets.id, before.outletId)).limit(1);
  const conflict = await hasConflict(before.outletId, { rentalUnitId: newRentalUnitId }, before.scheduledStart, before.scheduledEnd, outlet?.bookingBufferMinutes ?? 0, id);
  if (conflict) throw new Error("Unit tujuan juga sudah terisi pada slot waktu ini.");

  const [row] = await db
    .update(bookings)
    .set({ rentalUnitId: newRentalUnitId, consoleType: newUnit.consoleType, transferredFromUnitId: before.rentalUnitId })
    .where(eq(bookings.id, id))
    .returning();
  await logAudit({
    outletId: row.outletId,
    staffUserId,
    action: "transfer_booking_unit",
    entityType: "booking",
    entityId: id,
    before: { rentalUnitId: before.rentalUnitId },
    after: { rentalUnitId: newRentalUnitId, reason },
  });
  return row;
}

/** Check a booking in: picks the booked unit (or the first available unit matching consoleType) and starts the rental session — see startRentalSession's near-term booking guard for why walk-ins can't steal this slot out from under a confirmed booking. */
export async function checkInBooking(id: string, staffUserId?: string) {
  const [booking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
  if (!booking) throw new Error("Booking tidak ditemukan.");
  if (!["pending", "confirmed"].includes(booking.status)) throw new Error(`Booking berstatus "${booking.status}" tidak bisa check-in.`);

  let rentalUnitId = booking.rentalUnitId;
  if (!rentalUnitId && booking.consoleType) {
    const [availableUnit] = await db
      .select()
      .from(rentalUnits)
      .where(and(eq(rentalUnits.outletId, booking.outletId), eq(rentalUnits.consoleType, booking.consoleType as any), eq(rentalUnits.status, "available")));
    if (!availableUnit) throw new Error(`Tidak ada unit ${booking.consoleType} yang tersedia sekarang.`);
    rentalUnitId = availableUnit.id;
  }
  if (!rentalUnitId) throw new Error("Booking ini belum ditentukan unitnya.");

  // Carries the booked window's length into the session's plannedMinutes so the customer
  // gets exactly what they scheduled — this is also what makes the countdown timer and the
  // "time almost up" WhatsApp reminder (see runSessionTimeWarning in scheduler.ts) possible
  // at all for booking check-ins; without it the session would start open-ended and there'd
  // be no "remaining time" to show or warn about.
  const bookedMinutes = Math.round((new Date(booking.scheduledEnd).getTime() - new Date(booking.scheduledStart).getTime()) / 60000);

  const { session } = await startRentalSession({
    outletId: booking.outletId,
    rentalUnitId,
    customerId: booking.customerId,
    customerName: booking.customerName,
    plannedMinutes: bookedMinutes > 0 ? bookedMinutes : null,
    bookingId: booking.id,
    staffUserId,
  });

  await db.update(bookings).set({ checkedInAt: new Date().toISOString() }).where(eq(bookings.id, id));
  await logAudit({ outletId: booking.outletId, staffUserId, action: "check_in_booking", entityType: "booking", entityId: id, before: { status: booking.status }, after: { status: "checked_in", rentalSessionId: session.id } });
  return session;
}

export async function getBookingByCode(outletId: string, bookingCode: string) {
  const [row] = await db.select().from(bookings).where(and(eq(bookings.outletId, outletId), eq(bookings.bookingCode, bookingCode))).limit(1);
  return row ?? null;
}
