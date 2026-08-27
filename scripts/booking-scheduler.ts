/**
 * Standalone Booking Reservation Engine scheduler — polls every 60 seconds
 * and runs one pass of auto-release (expire/no-show stale bookings),
 * waitlist promotion, and reminder queuing. This codebase has no built-in
 * server-side cron (Next.js runs single-process via `next start`), so this
 * mirrors the existing scripts/whatsapp-bot.ts pattern: a small long-running
 * Node process you start alongside the web app.
 *
 * Run with:  npm run scheduler
 *
 * Purely data-side (marks bookings expired/no_show, promotes waitlist,
 * inserts booking_notifications rows) — it never depends on WhatsApp being
 * connected. Actual message delivery for whatever it queues happens
 * separately in scripts/whatsapp-bot.ts, which polls booking_notifications
 * on its own live socket. Run both processes for the full reminder loop; run
 * just this one if you only care about auto-release/waitlist correctness.
 */
import "dotenv/config";
import { runBookingScheduler } from "../src/lib/rental/scheduler";

const POLL_INTERVAL_MS = 60_000;

async function tick() {
  try {
    const result = await runBookingScheduler();
    if (
      result.released.length ||
      result.promoted.length ||
      result.remindersQueued.length ||
      result.homeRentalPickupRemindersQueued.length ||
      result.homeRentalReturnRemindersQueued.length
    ) {
      console.log(
        `[booking-scheduler] ${result.ranAt} — released ${result.released.length}, promoted ${result.promoted.length}, reminders queued ${result.remindersQueued.length}, home rental pickup reminders ${result.homeRentalPickupRemindersQueued.length}, home rental return reminders ${result.homeRentalReturnRemindersQueued.length}`
      );
    }
  } catch (err) {
    console.error("[booking-scheduler] Gagal menjalankan sweep:", err);
  }
}

console.log(`[booking-scheduler] Berjalan, polling setiap ${POLL_INTERVAL_MS / 1000} detik...`);
tick();
setInterval(tick, POLL_INTERVAL_MS);
