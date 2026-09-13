import { type DbOrTx } from "@/db/client";
import { journalEntries, receivables } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { voidJournal } from "./journal";

export interface OrderJournalReversalResult {
  /** True if there was a posted sales journal entry for this order (reference `ORDER-{id8}`) —
   * tells the caller whether postSalesJournal needs to be called again after commit to rebuild it. */
  hadSalesEntry: boolean;
  /** Snapshot of the receivable row (if any) that was voided+deleted, for the caller's audit log. */
  reversedReceivable: (typeof receivables.$inferSelect & { settlementEntryIds: string[] }) | null;
}

/**
 * Shared reversal step for correctPayment (lib/accounting/payment-correction.ts),
 * correctRentalCharge (lib/rental/rental-charge-correction.ts), and deleteOrderItem
 * (lib/pos/item-correction.ts) — voids everything that needs to be voided BEFORE the caller changes
 * payments.method/amount, the rental line item amount, or removes an item, and (outside this
 * transaction) reposts via postSalesJournal. Handles the two cases those functions need:
 *
 * 1) No receivable ever existed for this order (the common case): just voids the order's combined
 *    sales journal entry (reference `ORDER-{id8}`) via an exact offsetting reversal, and renames
 *    both the voided original and its reversal so postSalesJournal's own idempotency guard (a
 *    plain `reference` lookup) won't match either row and silently no-op instead of reposting.
 *
 * 2) A receivable exists for this order (a partial payment / running tab, whether still open or
 *    long since fully settled): voiding ONLY the original sales entry would corrupt the Piutang
 *    Usaha (1141) account balance — that entry's Dr Piutang Usaha line gets reversed to zero, but
 *    any LATER postReceivableSettlement entries that paid it down (Cr Piutang Usaha) would still
 *    stand, driving the account negative by exactly the settled amount. So this also finds and
 *    voids every settlement entry tied to the receivable (sourceType "receivable_payment", sourceId
 *    = receivable.id), then DELETES the receivable row itself (its role is now fully superseded —
 *    every journal entry that ever referenced it has been voided, so the row represents nothing
 *    real anymore; the caller is responsible for audit-logging the returned snapshot before it's
 *    gone). Deliberately safe to do: the underlying `payments` rows that actually collected the
 *    cash are NEVER touched here, only the journal/receivable BOOKKEEPING of what they were applied
 *    to — so when the caller reposts via postSalesJournal afterward, it naturally recomputes
 *    shortfall against every still-"success" payment on the order (regardless of whether it
 *    originally went through initiatePayment or postReceivableSettlement), and creates a fresh
 *    receivable only if a real shortfall still exists against the CORRECTED total.
 */
export async function reverseOrderJournalForCorrection(tx: DbOrTx, orderId: string, reason: string): Promise<OrderJournalReversalResult> {
  const reference = `ORDER-${orderId.slice(0, 8)}`;
  const supersededSuffix = `-VOID-${Date.now()}`;

  const [salesEntry] = await tx
    .select()
    .from(journalEntries)
    .where(and(eq(journalEntries.sourceId, orderId), eq(journalEntries.reference, reference), eq(journalEntries.status, "posted")))
    .limit(1);

  if (salesEntry) {
    await voidJournal(salesEntry.id, reason, tx);
    // voidJournal's reversal reuses the SAME reference as the original — rename both so
    // postSalesJournal's idempotency guard finds nothing and actually reposts.
    const [reversalEntry] = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceId, orderId), eq(journalEntries.reference, reference), eq(journalEntries.status, "posted")))
      .limit(1);
    await tx.update(journalEntries).set({ reference: `${reference}${supersededSuffix}` }).where(eq(journalEntries.id, salesEntry.id));
    if (reversalEntry) {
      await tx.update(journalEntries).set({ reference: `${reference}${supersededSuffix}-REV` }).where(eq(journalEntries.id, reversalEntry.id));
    }
  }

  const [receivable] = await tx.select().from(receivables).where(eq(receivables.orderId, orderId)).limit(1);
  let reversedReceivable: OrderJournalReversalResult["reversedReceivable"] = null;
  if (receivable) {
    const settlementEntries = await tx
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceId, receivable.id), eq(journalEntries.sourceType, "receivable_payment"), eq(journalEntries.status, "posted")));
    for (const entry of settlementEntries) {
      await voidJournal(entry.id, reason, tx);
    }
    reversedReceivable = { ...receivable, settlementEntryIds: settlementEntries.map((e) => e.id) };
    // Fully superseded now — every journal entry that ever referenced it (its own creation, via the
    // sales entry above, and every settlement above) has been voided. Deleting it (rather than
    // leaving a stale "open"/"paid" row nobody will ever look at again) lets the caller's fresh
    // postSalesJournal repost create a clean new receivable if — and only if — a real shortfall
    // still exists against the corrected total.
    await tx.delete(receivables).where(eq(receivables.id, receivable.id));
  }

  return { hadSalesEntry: !!salesEntry, reversedReceivable };
}
