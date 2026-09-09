/**
 * One-off, targeted data repair for a specific order: marks every "success" payment against it
 * as "failed" EXCEPT the one payment id you name to keep. Built for order 2f346654 (confirmed
 * via a manual SQL query to have 4 successful Rp5.000 cash payments against a Rp5.000 order, all
 * created and confirmed within about a second of each other on 2026-09-07 ~20:58 WIB — a
 * quadruple-tap on "Bayar" hitting initiatePayment before the race-condition fix in this same
 * change (see the advisory-lock comment on initiatePayment in lib/payments/index.ts)) — but
 * written generically so it can be reused if the same pattern turns up on another order.
 *
 * Why "failed" and not "refunded": "refunded" has a real, documented side effect elsewhere —
 * computeTransactionList (lib/reports/transactions.ts) sums every "refunded" payment into
 * refundedAmount and SUBTRACTS it from Net Sales for the period, which is correct for an actual
 * refund but would be WRONG here: no real refund happened, these are phantom duplicate records
 * that should simply stop counting, not show up as a fake Rp15.000 refund dragging Net Sales
 * down. "failed" has no special handling anywhere in reports — a failed payment just silently
 * drops out of every "status === success" sum (getOrderPaymentSummary, postSalesJournal's
 * successPayments, Transaction Center's cash-by-method breakdown, shift cash totals), which is
 * exactly the neutral "this one doesn't count" behavior needed. Never a hard delete — the
 * duplicate rows stay in the table with their real timestamps and provider refs, so the full
 * history (start-to-finish account of what actually happened) is still there if anyone needs to
 * look. An audit_logs entry is also written for each one.
 *
 * Does NOT touch the kept payment, the order, or post/repost any journal — after running this,
 * use the "Post Ulang" button on the order's missing_gl row in the Rekonsiliasi tab (or POST
 * /api/accounting/reconciliation/retry-posting) to actually post its now-balanced sales journal.
 *
 * Usage:  npx tsx scripts/void-duplicate-order-payments.ts <orderIdOrPrefix> <paymentIdToKeep>
 * Example: npx tsx scripts/void-duplicate-order-payments.ts 2f346654 68952051-35b1-4af0-ba1c-e76fa066e8c6
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { orders, payments } from "../src/db/schema";
import { eq, like, sql } from "drizzle-orm";
import { logAudit } from "../src/lib/audit/log";

async function main() {
  const [orderIdOrPrefix, keepPaymentId] = process.argv.slice(2);
  if (!orderIdOrPrefix || !keepPaymentId) {
    console.error("Usage: npx tsx scripts/void-duplicate-order-payments.ts <orderIdOrPrefix> <paymentIdToKeep>");
    process.exit(1);
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(orderIdOrPrefix.length >= 32 ? eq(orders.id, orderIdOrPrefix) : like(orders.id, `${orderIdOrPrefix}%`))
    .limit(1);
  if (!order) {
    console.error(`Order tidak ditemukan untuk "${orderIdOrPrefix}".`);
    process.exit(1);
  }

  const allPayments = await db.select().from(payments).where(eq(payments.orderId, order.id));
  const keep = allPayments.find((p) => p.id === keepPaymentId);
  if (!keep) {
    console.error(`Payment ${keepPaymentId} tidak ditemukan pada order ${order.id}.`);
    process.exit(1);
  }
  if (keep.status !== "success") {
    console.error(`Payment yang mau dipertahankan (${keepPaymentId}) statusnya "${keep.status}", bukan "success" — dibatalkan, cek ulang.`);
    process.exit(1);
  }

  const duplicates = allPayments.filter((p) => p.status === "success" && p.id !== keepPaymentId);
  if (duplicates.length === 0) {
    console.log(`Order ${order.id.slice(0, 8)}: tidak ada payment sukses lain selain ${keepPaymentId.slice(0, 8)} — tidak ada yang perlu dibatalkan.`);
    return;
  }

  console.log(`Order ${order.id.slice(0, 8)} (total ${order.total}): mempertahankan payment ${keep.id.slice(0, 8)} (${keep.amount}), membatalkan ${duplicates.length} duplikat:`);
  for (const dup of duplicates) {
    console.log(`  - ${dup.id.slice(0, 8)} — ${dup.amount} (${dup.providerRef}, dibuat ${dup.createdAt})`);
  }

  for (const dup of duplicates) {
    await db.update(payments).set({ status: "failed" }).where(eq(payments.id, dup.id));
    await logAudit({
      outletId: order.outletId,
      action: "correct_duplicate_payment",
      entityType: "payment",
      entityId: dup.id,
      before: { status: "success", amount: dup.amount },
      after: { status: "failed", reason: `Duplikat dari race condition initiatePayment (order ${order.id.slice(0, 8)}, dipertahankan ${keep.id.slice(0, 8)}) — dikoreksi oleh script pembersihan, bukan refund nyata` },
    });
  }

  const [{ remainingSuccessTotal } = { remainingSuccessTotal: 0 }] = (await db.execute(sql`
    SELECT COALESCE(SUM(amount), 0)::float AS "remainingSuccessTotal"
    FROM payments
    WHERE order_id = ${order.id} AND status = 'success'
  `)) as unknown as { remainingSuccessTotal: number }[];

  console.log(`\nSelesai. Total payment "success" untuk order ini sekarang: ${remainingSuccessTotal} (order.total: ${order.total}).`);
  if (Math.abs(remainingSuccessTotal - order.total) > 0.5) {
    console.log(`PERINGATAN: masih belum sama dengan order.total — cek manual sebelum klik "Post Ulang".`);
  } else {
    console.log(`Cocok dengan order.total — sekarang aman untuk klik "Post Ulang" di tab Rekonsiliasi.`);
  }
}

main().catch((err) => {
  console.error("Koreksi duplikat payment gagal:", err);
  process.exit(1);
});
