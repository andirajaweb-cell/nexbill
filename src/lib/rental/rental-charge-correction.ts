import { db } from "@/db/client";
import { orders, orderItems, rentalSessions, payments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { postSalesJournal } from "@/lib/accounting/postings";
import { reverseOrderJournalForCorrection } from "@/lib/accounting/order-journal-correction";
import { recomputeBillTotals } from "@/lib/pos/bill";
import { logAudit } from "@/lib/audit/log";

/**
 * Corrects a rental transaction's billed AMOUNT after the fact — built specifically for the bug
 * fixed in lib/rental/sessions.ts (stopRentalSession used to re-read a promo's CURRENT
 * packagePrice/durationMinutes at session-end instead of what was frozen at session-start, so
 * editing a promo's price while a session was running silently changed an already-agreed bill).
 * That fix stops NEW drift; this function lets an owner/superuser fix an ALREADY-finalized
 * transaction whose rental line total came out wrong (whether from that bug or any other reason —
 * e.g. a cashier manually mis-keyed an amount).
 *
 * HOW IT WORKS: same safe void+repost pattern as correctPaymentMethod
 * (lib/accounting/payment-correction.ts), sharing its reversal step (reverseOrderJournalForCorrection
 * in lib/accounting/order-journal-correction.ts) — never mutates a posted journal line in place.
 * Voids the order's combined sales journal entry (postSalesJournal's own reference, `ORDER-{id8}`)
 * via an exact offsetting reversal AND, if the order has a receivable (a partial payment / running
 * tab, whether still open or long since fully settled), every settlement entry ever posted against
 * it too — then deletes that now-fully-superseded receivable row. See that helper's own doc comment
 * for why both have to be voided together (voiding only the original would corrupt the Piutang
 * Usaha balance). The rental line item's amount is then corrected, and — AFTER this transaction
 * commits — recomputeBillTotals() then postSalesJournal() run as fresh, separate calls to rebuild
 * the order's totals and repost a correctly-balanced journal from scratch, which naturally recreates
 * a receivable only if a real shortfall still exists against the CORRECTED total (the underlying
 * `payments` rows that actually collected cash are never touched, so they still count toward
 * paidTotal either way). Also keeps `rentalSessions.totalAmount` in sync: that column is read
 * independently by Dashboard/Operational revenue reports (lib/reports/operational.ts,
 * /api/dashboard/owner, /api/reports/summary) which never touch orders/orderItems at all — without
 * updating it too, those pages would keep showing the old wrong number even after Transaction
 * Center's own total is corrected, reopening exactly the cross-page reconciliation gap this
 * codebase has otherwise deliberately closed everywhere else.
 *
 * Still refuses (with a clear reason) when there's genuinely nothing safe to do: no rental line
 * item exists on the order, or the order is "cancelled".
 *
 * TARGETING A SPECIFIC ITEM: a merged order (mergeOrders in lib/pos/split-merge.ts) can carry
 * MULTIPLE itemType:"rental" lines — one per originating session/unit that got combined into one
 * payable bill — with no traceable link back to which rentalSessions row each came from (merge
 * copies productId/description/qty/unitPrice/lineTotal/itemType/kitchenStatus only). orderItemId
 * is therefore REQUIRED and must belong to this exact order; without it, an earlier version of
 * this function picked "the first rental item found" regardless of which line the caller actually
 * meant to correct — silently wrong on any merged multi-rental order.
 */
export async function correctRentalCharge(orderId: string, orderItemId: string, newAmount: number, staffUserId: string | undefined) {
  if (!Number.isFinite(newAmount) || newAmount < 0) throw new Error("Nominal koreksi harus angka >= 0.");

  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${orderId}))`);

    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Transaksi tidak ditemukan.");
    if (order.status === "cancelled") throw new Error("Transaksi ini sudah dibatalkan — tidak ada yang perlu dikoreksi.");

    const [rentalItem] = await tx.select().from(orderItems).where(and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId), eq(orderItems.itemType, "rental"))).limit(1);
    if (!rentalItem) throw new Error("Baris tagihan Rental ini tidak ditemukan pada transaksi ini.");
    if (rentalItem.kitchenStatus === "cancelled") throw new Error("Baris ini sudah dihapus — tidak ada yang perlu dikoreksi.");

    const oldAmount = rentalItem.lineTotal;
    const roundedNew = Math.round(newAmount);
    if (oldAmount === roundedNew) return { reposted: false as const, oldAmount, newAmount: roundedNew, reversedReceivable: null };

    const reason = `Koreksi nominal rental: Rp${oldAmount.toLocaleString("id-ID")} -> Rp${roundedNew.toLocaleString("id-ID")}`;
    const { hadSalesEntry, reversedReceivable } = await reverseOrderJournalForCorrection(tx, orderId, reason);

    await tx.update(orderItems).set({ unitPrice: roundedNew, lineTotal: roundedNew }).where(eq(orderItems.id, rentalItem.id));

    // rentalSessions.totalAmount mirrors the rental-only charge (package+overtime, same shape
    // stopRentalSession itself writes there) — see this function's doc comment for why it must
    // stay in sync independently of orders/orderItems.
    if (order.rentalSessionId) {
      await tx.update(rentalSessions).set({ totalAmount: roundedNew }).where(eq(rentalSessions.id, order.rentalSessionId));
    }

    // A receivable existing implies a sales entry existed too (postSalesJournal is the only thing
    // that ever creates one) — repost either way whenever something was actually voided.
    return { reposted: hadSalesEntry || !!reversedReceivable, oldAmount, newAmount: roundedNew, reversedReceivable };
  });

  if (outcome.oldAmount !== outcome.newAmount) {
    // Fresh, separate calls/transactions — must run after the transaction above commits, for the
    // same reason (and using the same commit-then-call-separately pattern) as correctPaymentMethod:
    // recomputeBillTotals/postSalesJournal are not tx-aware and would otherwise run on a different
    // connection that can't see this function's still-uncommitted rename/item update.
    await recomputeBillTotals(orderId);
    if (outcome.reposted) {
      await postSalesJournal(orderId);
    }

    // postSalesJournal never touches orders.status (only settleOrderAfterPayment does, and that
    // function early-returns on an already-"paid" order — exactly the wrong behavior here, since a
    // correction can legitimately move a "paid" order back to "partial" if the new, higher total no
    // longer matches what was actually collected). Re-derive status directly from successful
    // payments vs the corrected total instead, mirroring settleOrderAfterPayment's own status logic
    // minus that guard. Only touches status when there's actual payment history to react to — an
    // order that's still "open"/"awaiting_payment" with nothing paid yet is left alone, since a
    // future normal payment will settle it the usual way.
    const [freshOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (freshOrder) {
      const successPayments = await db.select({ amount: payments.amount }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "success")));
      const paidTotal = successPayments.reduce((s, p) => s + p.amount, 0);
      if (paidTotal > 0) {
        const fullyPaid = paidTotal >= freshOrder.total - 0.5;
        const newStatus = fullyPaid ? "paid" : "partial";
        if (newStatus !== freshOrder.status) {
          await db.update(orders).set({ status: newStatus }).where(eq(orders.id, orderId));
        }
      }
    }
  }

  await logAudit({
    staffUserId,
    action: "correct_rental_charge",
    entityType: "order",
    entityId: orderId,
    before: { rentalLineAmount: outcome.oldAmount, reversedReceivable: outcome.reversedReceivable },
    after: { rentalLineAmount: outcome.newAmount },
  });

  return outcome;
}
