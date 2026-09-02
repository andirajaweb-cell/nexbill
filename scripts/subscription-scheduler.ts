/**
 * Standalone NEXBILL platform-billing scheduler — polls once every hour and
 * runs one full sweep of the subscription lifecycle: trial reminders
 * (H-5/H-2/H-0), trial expiry, renewal invoice generation, and grace/suspend
 * transitions. Same pattern as scripts/booking-scheduler.ts (this codebase
 * has no built-in server cron — Next.js runs single-process via `next
 * start`), so this is a small long-running Node process you start alongside
 * the web app.
 *
 * Run with:  npm run subscription:scheduler
 *
 * Every state transition (trial_expired/grace/suspended/renewal invoice) is
 * pure DB work via lib/subscription/service.ts; email notifications for each
 * event are sent from here right after the sweep, using
 * lib/notifications/email.ts (safe no-op if RESEND_API_KEY isn't set).
 */
import "dotenv/config";
import {
  sweepTrialReminders,
  sweepExpireTrials,
  sweepGenerateRenewalInvoices,
  sweepGraceAndSuspend,
  sweepExpireStaleUnpaidInvoices,
  getOutletBillingContact,
  logEvent,
} from "../src/lib/subscription/service";
import { sendEmail, trialReminderEmail, trialExpiredPaymentInfoEmail } from "../src/lib/notifications/email";

const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 hour — trial/renewal windows are day-granularity, no need to poll faster
const BILLING_URL = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/dashboard/billing`;

async function tick() {
  const ranAt = new Date().toISOString();
  try {
    // 1) Trial reminders (H-5/H-2/H-0) — send then log, so a crash mid-send doesn't mark a reminder as sent when it wasn't.
    const remindersDue = await sweepTrialReminders();
    for (const { sub, daysLeft, eventType } of remindersDue) {
      const { email, outletName } = await getOutletBillingContact(sub.outletId);
      if (email) {
        const tpl = trialReminderEmail(outletName, daysLeft, BILLING_URL);
        await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
      }
      await logEvent(sub.outletId, sub.id, eventType, `Reminder H-${daysLeft} dikirim ke ${email ?? "(tidak ada email)"}`);
    }

    // 2) Expire trials whose 30-hari window just closed -> trial_expired, then email payment info.
    const expired = await sweepExpireTrials();
    for (const sub of expired) {
      const { email, outletName } = await getOutletBillingContact(sub.outletId);
      if (email) {
        const tpl = trialExpiredPaymentInfoEmail(outletName, BILLING_URL);
        await sendEmail({ to: email, subject: tpl.subject, html: tpl.html });
      }
    }

    // 3) Generate renewal invoices for active subs nearing currentPeriodEnd.
    const renewals = await sweepGenerateRenewalInvoices();

    // 4) Flip unpaid-past-due active subs to grace, and grace-past-graceUntil subs to suspended.
    const transitions = await sweepGraceAndSuspend();

    // 5) Soft-cancel any invoice still unpaid 2x24 jam after it was created ("masa berlaku" — see
    // that function's doc comment for why this is a soft status flip, not a hard delete). The
    // per-request self-heal in applyLifecycleTransitions already covers outlets someone is
    // actively viewing; this table-wide sweep is the backstop for everyone else.
    const staleInvoices = await sweepExpireStaleUnpaidInvoices();

    if (remindersDue.length || expired.length || renewals.length || transitions.length || staleInvoices.length) {
      console.log(
        `[subscription-scheduler] ${ranAt} — reminders ${remindersDue.length}, expired ${expired.length}, renewal invoices ${renewals.length}, grace/suspend transitions ${transitions.length}, stale invoices expired ${staleInvoices.length}`
      );
    }
  } catch (err) {
    console.error("[subscription-scheduler] Gagal menjalankan sweep:", err);
  }
}

console.log(`[subscription-scheduler] Berjalan, polling setiap ${POLL_INTERVAL_MS / 60000} menit...`);
tick();
setInterval(tick, POLL_INTERVAL_MS);
