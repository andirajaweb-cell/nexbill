import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { journalEntries, journalLines, accounts, orders } from "@/db/schema";
import { eq, and, inArray, notInArray, gte, lte, sql } from "drizzle-orm";
import { computeTransactionList } from "@/lib/reports/transactions";
import { reconcileOrders, type ReconciliationGlInput, type OrphanGlRow } from "@/lib/reports/reconciliation";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Order-level reconciliation between Transaction Center (Business Date basis) and Accounting's
 * General Ledger (posting/entryDate basis) for the same [from, to] window — see the doc comment
 * atop lib/reports/reconciliation.ts for the full rationale. Built specifically to answer "which
 * order(s) explain this summary-card gap" instead of leaving that as a manual screenshot exercise.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;

    const from = req.nextUrl.searchParams.get("from");
    const to = req.nextUrl.searchParams.get("to");
    if (!from || !to) return NextResponse.json({ error: "Parameter from/to wajib diisi." }, { status: 400 });

    // Same dataset Transaction Center's own Daftar Transaksi tab shows for this period — every
    // "valid" (non-cancelled) AND cancelled order both included here (computeTransactionList
    // returns the full pre-filter `transactions` array, not just the valid subset), since a
    // cancelled order with lingering GL revenue is exactly one of the bug shapes this tool exists
    // to catch (see reconcileOrders' "cancelled_with_gl" status).
    const txResult = await computeTransactionList({ outletId, from, to });
    const txInputs = txResult.transactions.map((t) => ({
      orderId: t.id,
      businessDate: t.businessDate,
      status: t.status as "open" | "awaiting_payment" | "partial" | "paid" | "cancelled",
      total: t.total,
      type: t.type,
    }));
    const orderIds = txInputs.map((t) => t.orderId);

    // Revenue actually posted for exactly these orders, REGARDLESS of which period the journal's
    // own entryDate falls in — an entryDate that has drifted outside [from, to] relative to the
    // order's businessDate is precisely the "date_mismatch" case this tool needs to surface, so
    // this must NOT be filtered by entryDate itself.
    //
    // netRevenue = sum(credit - debit) across only revenue-type account lines. Discount posts as
    // its own debit line against a revenue-type contra account (4910) in the SAME sales journal,
    // so it's already netted in here — this sum should equal order.total exactly for a correctly-
    // posted order (see recomputeBillTotals: total = (subtotal - discount) + tax + serviceCharge,
    // which is exactly what the sales journal's revenue-account credits minus its discount debit
    // works out to).
    const glRows = orderIds.length
      ? await db
          .select({
            orderId: journalEntries.sourceId,
            entryDate: sql<string>`max(${journalEntries.entryDate})`,
            netRevenue: sql<number>`sum(${journalLines.credit} - ${journalLines.debit})`,
          })
          .from(journalLines)
          .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
          .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
          .where(
            and(
              eq(journalEntries.outletId, outletId),
              inArray(journalEntries.sourceType, ["rental", "pos"]),
              inArray(journalEntries.sourceId, orderIds),
              eq(accounts.type, "revenue")
            )
          )
          .groupBy(journalEntries.sourceId)
      : [];
    const glByOrderId = new Map<string, ReconciliationGlInput>(
      glRows.filter((r) => r.orderId).map((r) => [r.orderId as string, { orderId: r.orderId as string, entryDate: r.entryDate, netRevenue: r.netRevenue ?? 0 }])
    );

    // Orphan scan: GL revenue actually posted (entryDate) inside THIS window for an order
    // Transaction Center doesn't attribute to this window at all — its businessDate must have
    // landed on a different day (or the order predates the businessDate backfill and its
    // createdAt-fallback pushed it elsewhere). This is the other half of "date_mismatch": the
    // orders map above only catches drift for orders Transaction Center DID include; this catches
    // the ones it silently excluded while the GL still counted them here.
    const orphanConditions = [eq(journalEntries.outletId, outletId), inArray(journalEntries.sourceType, ["rental", "pos"]), gte(journalEntries.entryDate, from), lte(journalEntries.entryDate, to)];
    if (orderIds.length) orphanConditions.push(notInArray(journalEntries.sourceId, orderIds));
    const orphanRows = await db
      .select({
        orderId: journalEntries.sourceId,
        entryDate: sql<string>`max(${journalEntries.entryDate})`,
        netRevenue: sql<number>`sum(${journalLines.credit} - ${journalLines.debit})`,
      })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
      .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
      .where(and(...orphanConditions))
      .groupBy(journalEntries.sourceId);
    const orphans: OrphanGlRow[] = orphanRows.filter((r) => r.orderId).map((r) => ({ orderId: r.orderId as string, glEntryDate: r.entryDate, glRevenue: r.netRevenue ?? 0 }));

    const { rows, summary } = reconcileOrders(txInputs, glByOrderId, orphans);

    // Rows are the whole point of this tool — sort the interesting ones (anything that isn't a
    // clean match or an expected not-yet-paid order) to the top so the merchant doesn't have to
    // scroll past 90 "match" rows to find the one that matters.
    const priority: Record<string, number> = { missing_gl: 0, cancelled_with_gl: 1, amount_mismatch: 2, date_mismatch: 3, pending_payment: 4, match: 5 };
    rows.sort((a, b) => (priority[a.reconciliationStatus] ?? 9) - (priority[b.reconciliationStatus] ?? 9));

    return NextResponse.json({ rows, orphans, summary, from, to });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
