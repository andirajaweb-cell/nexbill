import { db } from "@/db/client";
import { orders, payments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { postSalesJournal } from "./postings";
import { reverseOrderJournalForCorrection } from "./order-journal-correction";
import { logAudit } from "@/lib/audit/log";

export interface PaymentCorrectionUpdates {
  newMethod?: string;
  /** Corrects the payment's NOMINAL/amount — e.g. after a rental/item correction changes the
   * order's total, a previously-collected cash payment may no longer match it (over/under-paid)
   * and the owner wants to fix the recorded amount itself, not just its method. */
  newAmount?: number;
}

/**
 * Corrects a settled ("success") payment's METHOD and/or AMOUNT after the fact. Originally built
 * for the common real-world mistake of a cashier tapping "QRIS" but actually receiving cash (or
 * vice versa); extended to also correct the NOMINAL because correcting a rental charge or deleting
 * a duplicate item (lib/rental/rental-charge-correction.ts, lib/pos/item-correction.ts) changes
 * order.total but never touches the payments already on file — leaving a payment amount that no
 * longer matches what the order now actually costs (over/under-paid) with no way to fix it except
 * this. Owner/superuser only (see the isSuperuser role check on /dashboard/transactions and the
 * matching check in PATCH /api/transactions/[id]/payments/[paymentId]/route.ts, which must stay in
 * sync with this).
 *
 * HOW IT WORKS: never mutates a posted journal line in place (this codebase's standing rule —
 * see voidJournal's own doc comment). Instead it reverses the order's journal history via the
 * shared reverseOrderJournalForCorrection() (lib/accounting/order-journal-correction.ts) — voids
 * the combined sales journal entry (postSalesJournal's own reference, `ORDER-{id8}`) via an exact
 * offsetting reversal AND, if the order has a receivable (a partial payment / running tab, whether
 * still open or long since fully settled), every settlement entry ever posted against it too, then
 * deletes that now-superseded receivable row — see that helper's own doc comment for why both have
 * to be voided together. Updates payments.method/amount, and then — AFTER this transaction commits
 * — calls postSalesJournal(orderId) again as a fresh, separate call. That reposts a brand-new,
 * correctly-balanced entry by recomputing every cash line from the payments table's CURRENT values
 * (only the one just corrected actually changed) using postSalesJournal's own well-tested
 * revenue/COGS/discount/fee logic, and naturally recreates a receivable only if a real shortfall
 * still exists (every payment row — however it was originally collected — still counts toward
 * paidTotal, since only the journal/receivable BOOKKEEPING is reversed here, never the payments
 * themselves). The repost must happen outside this function's own db.transaction() block:
 * postSalesJournal opens its OWN separate `db.transaction()` on its own connection, which — under
 * normal read-committed isolation — would NOT see this function's rename if it were still
 * uncommitted, and could then either wrongly no-op (if it still saw the pre-rename reference) or
 * race unpredictably. Same commit-then-call-separately pattern already established in
 * editPurchaseInvoiceLines (lib/inventory/purchase-invoice-correction.ts) for the identical class
 * of problem.
 *
 * After reposting, also re-derives orders.status from payments vs the (unchanged) order.total —
 * mirroring correctRentalCharge/deleteOrderItem's own status re-derivation — since lowering a
 * payment's amount can turn a "paid" order into merely "partial" (the reverse, raising it, can
 * likewise turn "partial" into "paid").
 *
 * Still refuses (with a clear reason) for the one case that's genuinely unsafe to unwind
 * automatically: `payment.kind === "deposit"`. Its cash was journaled separately at DP-collection
 * time (postDepositJournal, reference `DEP-{paymentId8}`) and may already have been reclassified
 * into revenue by a rental session finishing (see postSalesJournal's "kind === deposit" branch) —
 * correcting it here could desync from that liability bookkeeping. Everything else — including the
 * overwhelming majority of real "salah pencet metode bayar"/"nominal kurang pas" mistakes, whether
 * on a simple fully-paid sale or one with a receivable/running-tab history — is supported.
 */
export async function correctPayment(orderId: string, paymentId: string, updates: PaymentCorrectionUpdates, staffUserId: string | undefined) {
  if (updates.newAmount !== undefined && (!Number.isFinite(updates.newAmount) || updates.newAmount < 0)) {
    throw new Error("Nominal pembayaran harus angka >= 0.");
  }

  const outcome = await db.transaction(async (tx) => {
    // Same advisory-lock pattern as postSalesJournal/initiatePayment — serializes this against any
    // concurrent payment/settlement activity on the same order.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${orderId}))`);

    const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment || payment.orderId !== orderId) throw new Error("Pembayaran tidak ditemukan.");
    if (payment.status !== "success") throw new Error("Hanya pembayaran berstatus sukses/lunas yang bisa dikoreksi.");
    if (payment.kind === "deposit") {
      throw new Error("Pembayaran DP (uang muka) tidak didukung untuk koreksi otomatis — sudah tercatat terpisah sebagai liability dan mungkin sudah dipakai di jurnal sesi rental. Hubungi tim teknis untuk koreksi manual.");
    }

    const oldMethod = payment.method;
    const oldAmount = payment.amount;
    const newMethod = updates.newMethod ?? oldMethod;
    const newAmount = Math.round(updates.newAmount ?? oldAmount);

    if (oldMethod === newMethod && oldAmount === newAmount) {
      return { reposted: false as const, oldMethod, newMethod, oldAmount, newAmount, reversedReceivable: null };
    }

    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Order tidak ditemukan.");

    const reasonParts: string[] = [];
    if (oldMethod !== newMethod) reasonParts.push(`metode: ${oldMethod} -> ${newMethod}`);
    if (oldAmount !== newAmount) reasonParts.push(`nominal: Rp${oldAmount.toLocaleString("id-ID")} -> Rp${newAmount.toLocaleString("id-ID")}`);
    const reason = `Koreksi pembayaran (${reasonParts.join(", ")})`;
    const { reversedReceivable } = await reverseOrderJournalForCorrection(tx, orderId, reason);

    await tx.update(payments).set({ method: newMethod, amount: newAmount }).where(eq(payments.id, paymentId));

    // If neither a sales entry nor a receivable ever existed for this order, postSalesJournal's own
    // best-effort call must have silently failed earlier (see runPostPaymentSideEffects's try/catch)
    // — nothing was actually voided above, so calling it again below just posts for the first time.
    // Either way, always repost: the correction needs to land in the journal one way or another.
    return { reposted: true as const, oldMethod, newMethod, oldAmount, newAmount, reversedReceivable };
  });

  if (outcome.reposted) {
    // Fresh, separate call/transaction — see the doc comment above for why this can't run nested
    // inside the transaction above. Best-effort in the same sense postSalesJournal already is
    // elsewhere (runPostPaymentSideEffects) — if this throws, the payment change and the journal
    // void above are already committed, so the order is left in the same "missing_gl, needs Post
    // Ulang" recoverable state the Rekonsiliasi tab already knows how to surface and retry, not a
    // half-corrected/inconsistent one.
    await postSalesJournal(orderId);

    // Re-derive orders.status from payments vs total — same logic as correctRentalCharge/
    // deleteOrderItem. postSalesJournal never touches orders.status itself.
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
    action: "correct_payment",
    entityType: "payment",
    entityId: paymentId,
    before: { orderId, method: outcome.oldMethod, amount: outcome.oldAmount, reversedReceivable: outcome.reversedReceivable },
    after: { orderId, method: outcome.newMethod, amount: outcome.newAmount },
  });

  return outcome;
}
