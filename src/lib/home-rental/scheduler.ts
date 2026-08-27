import { db } from "@/db/client";
import { homeRentalRentals, bookingNotifications, outlets } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { queueHomeRentalNotification, homeRentalMessages, outletName, HomeRentalNotificationType } from "./notifications";
import { isFeatureEnabled } from "./feature-flags";

/**
 * Home Rental's equivalent of lib/rental/scheduler.ts — pickup reminders (H-24/H-2) for
 * "booked" rentals and due-now/repeating-overdue reminders for "active" (picked up, not yet
 * returned) rentals. Deliberately hooked into the SAME external poller as the booking module
 * (see runBookingScheduler() below and scripts/booking-scheduler.ts) rather than a second cron
 * process — one poll tick now sweeps both modules.
 */

const MINUTE = 60000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

async function listOutlets(outletId?: string) {
  return outletId ? db.select().from(outlets).where(eq(outlets.id, outletId)) : db.select().from(outlets);
}

const PICKUP_REMINDER_WINDOWS: {
  type: HomeRentalNotificationType;
  minutesBefore: number;
  toleranceMinutes: number;
  render: (code: string, name: string, start: string) => string;
}[] = [
  { type: "hr_reminder_h24", minutesBefore: 1440, toleranceMinutes: 15, render: homeRentalMessages.reminderH24 },
  { type: "hr_reminder_h2", minutesBefore: 120, toleranceMinutes: 10, render: homeRentalMessages.reminderH2 },
];

/** Queues H-24/H-2 pickup reminders for "booked" (not-yet-picked-up) rentals. */
export async function runHomeRentalPickupReminders(outletId?: string) {
  const queued: string[] = [];
  const outletRows = await listOutlets(outletId);

  for (const outlet of outletRows) {
    if (!(await isFeatureEnabled(outlet.id, "HOME_RENTAL_REMINDER"))) continue;
    const upcoming = await db.select().from(homeRentalRentals).where(and(eq(homeRentalRentals.outletId, outlet.id), eq(homeRentalRentals.status, "booked")));
    if (upcoming.length === 0) continue;
    const name = await outletName(outlet.id);

    for (const r of upcoming) {
      if (!r.phone) continue;
      const minutesUntil = (new Date(r.scheduledStart).getTime() - Date.now()) / MINUTE;
      for (const w of PICKUP_REMINDER_WINDOWS) {
        if (minutesUntil <= w.minutesBefore && minutesUntil > w.minutesBefore - w.toleranceMinutes) {
          const row = await queueHomeRentalNotification({
            rentalId: r.id,
            outletId: outlet.id,
            type: w.type,
            phone: r.phone,
            message: w.render(r.rentalCode, name, r.scheduledStart),
          });
          if (row) queued.push(row.id);
        }
      }
    }
  }
  return queued;
}

// H-24 gives customers advance notice their rental is ending soon (not just a same-day nudge) —
// same tolerance-band trick as the pickup reminders above, just for the return side.
const RETURN_H24_MINUTES_BEFORE = 1440;
const RETURN_H24_TOLERANCE_MINUTES = 20;
// A 3-hour band around scheduledEnd is wide enough that a ~1-minute poll interval never misses
// "due today", without needing separate bookkeeping — same tolerance-band trick as the booking
// module's REMINDER_WINDOWS.
const DUE_NOW_TOLERANCE_MINUTES = 180;
// Once overdue, don't nudge again for another 12h — checked against the most recent hr_overdue
// row (pending OR already sent) instead of the pending-only dedup queueHomeRentalNotification
// normally uses, since an overdue rental needs repeated nudges, not a single fire-and-forget.
const OVERDUE_RECHECK_HOURS = 12;

/** Queues a due-today reminder once, then a repeating overdue reminder every OVERDUE_RECHECK_HOURS, for "active" (picked up, not yet returned) rentals. */
export async function runHomeRentalReturnReminders(outletId?: string) {
  const queued: string[] = [];
  const outletRows = await listOutlets(outletId);

  for (const outlet of outletRows) {
    if (!(await isFeatureEnabled(outlet.id, "HOME_RENTAL_REMINDER"))) continue;
    const active = await db.select().from(homeRentalRentals).where(and(eq(homeRentalRentals.outletId, outlet.id), eq(homeRentalRentals.status, "active")));
    if (active.length === 0) continue;
    const name = await outletName(outlet.id);
    const now = Date.now();

    for (const r of active) {
      if (!r.phone) continue;
      const endMs = new Date(r.scheduledEnd).getTime();
      const minutesUntilEnd = (endMs - now) / MINUTE;

      if (minutesUntilEnd > 0) {
        if (minutesUntilEnd <= RETURN_H24_MINUTES_BEFORE && minutesUntilEnd > RETURN_H24_MINUTES_BEFORE - RETURN_H24_TOLERANCE_MINUTES) {
          const row = await queueHomeRentalNotification({
            rentalId: r.id,
            outletId: outlet.id,
            type: "hr_return_h24",
            phone: r.phone,
            message: homeRentalMessages.returnH24(r.rentalCode, name, r.scheduledEnd),
          });
          if (row) queued.push(row.id);
        }
        if (minutesUntilEnd <= DUE_NOW_TOLERANCE_MINUTES) {
          const row = await queueHomeRentalNotification({
            rentalId: r.id,
            outletId: outlet.id,
            type: "hr_due_now",
            phone: r.phone,
            message: homeRentalMessages.dueNow(r.rentalCode, name, r.scheduledEnd),
          });
          if (row) queued.push(row.id);
        }
        continue;
      }

      // Overdue — only re-nudge if the last hr_overdue notification (of any status) for this
      // rental is older than OVERDUE_RECHECK_HOURS, or none exists yet.
      const cutoff = new Date(now - OVERDUE_RECHECK_HOURS * HOUR).toISOString();
      const recent = await db
        .select({ id: bookingNotifications.id })
        .from(bookingNotifications)
        .where(and(eq(bookingNotifications.homeRentalRentalId, r.id), eq(bookingNotifications.type, "hr_overdue"), gte(bookingNotifications.createdAt, cutoff)))
        .limit(1);
      if (recent.length > 0) continue;

      const daysLate = Math.max(1, Math.ceil(-minutesUntilEnd / (DAY / MINUTE)));
      const row = await queueHomeRentalNotification({
        rentalId: r.id,
        outletId: outlet.id,
        type: "hr_overdue",
        phone: r.phone,
        message: homeRentalMessages.overdue(r.rentalCode, name, r.scheduledEnd, daysLate),
      });
      if (row) queued.push(row.id);
    }
  }
  return queued;
}

/** Runs both Home Rental reminder sweeps — meant to be chained alongside runBookingScheduler() in one poll tick. */
export async function runHomeRentalScheduler(outletId?: string) {
  const pickupRemindersQueued = await runHomeRentalPickupReminders(outletId);
  const returnRemindersQueued = await runHomeRentalReturnReminders(outletId);
  return { pickupRemindersQueued, returnRemindersQueued, ranAt: new Date().toISOString() };
}
