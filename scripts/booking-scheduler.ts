/**
 * Standalone Booking Reservation Engine scheduler — polls every 15 seconds
 * and runs one pass of auto-release (expire/no-show stale bookings),
 * waitlist promotion, reminder queuing, and rental-session auto-stop
 * (ensures every session whose plannedMinutes ran out gets stopped — and its
 * device powered off — even if nobody has the Rental PS page open). This
 * codebase has no built-in server-side cron (Next.js runs single-process via
 * `next start`), so this mirrors the existing scripts/whatsapp-bot.ts
 * pattern: a small long-running Node process you start alongside the web app.
 *
 * Run with:  npm run scheduler
 *
 * Purely data-side (marks bookings expired/no_show, promotes waitlist,
 * inserts booking_notifications rows, stops timed-out rental sessions) — it
 * never depends on WhatsApp being connected. Actual message delivery for
 * whatever it queues happens separately in scripts/whatsapp-bot.ts, which
 * polls booking_notifications on its own live socket. Run both processes for
 * the full reminder loop; run just this one if you only care about
 * auto-release/waitlist/session-auto-stop correctness.
 */
import "dotenv/config";
import { runBookingScheduler } from "../src/lib/rental/scheduler";

// Lowered from 60s to 15s specifically so rental-session auto-stop (runSessionAutoStop) reacts
// within ~15s of time running out instead of up to a minute — auto-release/waitlist/reminders
// piggyback on the same faster tick, which is harmless since they're all cheap idempotent
// queries against a small number of active outlets.
const POLL_INTERVAL_MS = 15_000;

async function tick() {
  try {
    const result = await runBookingScheduler();
    if (
      result.released.length ||
      result.promoted.length ||
      result.remindersQueued.length ||
      result.sessionsAutoStopped.length ||
      result.homeRentalPickupRemindersQueued.length ||
      result.homeRentalReturnRemindersQueued.length
    ) {
      console.log(
        `[booking-scheduler] ${result.ranAt} — released ${result.released.length}, promoted ${result.promoted.length}, reminders queued ${result.remindersQueued.length}, sessions auto-stopped ${result.sessionsAutoStopped.length}, home rental pickup reminders ${result.homeRentalPickupRemindersQueued.length}, home rental return reminders ${result.homeRentalReturnRemindersQueued.length}`
      );
    }
  } catch (err) {
    console.error("[booking-scheduler] Gagal menjalankan sweep:", err);
  }
}

console.log(`[booking-scheduler] Berjalan, polling setiap ${POLL_INTERVAL_MS / 1000} detik...`);
tick();
setInterval(tick, POLL_INTERVAL_MS);
