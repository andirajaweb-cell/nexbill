import { db } from "@/db/client";
import { ppobTransactions, cashBankAccounts, staffUsers, customers } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { getFastpaySaldoBalance } from "./engine";

function dayRangeConditions(column: any, from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(sql`${column} >= ${from}`);
  if (to) conditions.push(sql`${column} <= ${to}`);
  return conditions;
}

export interface PpobListFilters {
  outletId: string;
  from?: string;
  to?: string;
  category?: string;
  status?: string;
  staffUserId?: string;
}

export async function computePpobList(filters: PpobListFilters) {
  const conditions = [sql`${ppobTransactions.outletId} = ${filters.outletId}`, ...dayRangeConditions(ppobTransactions.createdAt, filters.from, filters.to)];
  if (filters.category) conditions.push(sql`${ppobTransactions.category} = ${filters.category}`);
  if (filters.status) conditions.push(sql`${ppobTransactions.status} = ${filters.status}`);
  if (filters.staffUserId) conditions.push(sql`${ppobTransactions.staffUserId} = ${filters.staffUserId}`);

  const rows = await db.select().from(ppobTransactions).where(sql.join(conditions, sql` AND `)).orderBy(sql`${ppobTransactions.createdAt} DESC`);

  const [accountRows, staffRows, customerRows] = await Promise.all([
    db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, filters.outletId)),
    db.select().from(staffUsers).where(eq(staffUsers.outletId, filters.outletId)),
    db.select().from(customers).where(eq(customers.outletId, filters.outletId)),
  ]);
  const accountNameById = new Map(accountRows.map((a) => [a.id, a.name]));
  const staffNameById = new Map(staffRows.map((s) => [s.id, s.name]));
  const customerNameById = new Map(customerRows.map((c) => [c.id, c.name ?? c.phone]));

  const transactions = rows.map((r) => ({
    ...r,
    fundingAccountName: accountNameById.get(r.fundingCashBankAccountId) ?? "-",
    receivingAccountName: accountNameById.get(r.receivingCashBankAccountId) ?? "-",
    staffName: r.staffUserId ? staffNameById.get(r.staffUserId) ?? "-" : "-",
    customerDisplayName: r.customerName ?? (r.customerId ? customerNameById.get(r.customerId) : null) ?? "-",
  }));

  const active = transactions.filter((t) => t.status === "success");
  const byCategoryMap = new Map<string, { count: number; nominal: number; providerFee: number; feeAdmin: number; principal: number }>();
  for (const t of active) {
    const cur = byCategoryMap.get(t.category) ?? { count: 0, nominal: 0, providerFee: 0, feeAdmin: 0, principal: 0 };
    cur.count += 1;
    cur.nominal += t.nominal;
    cur.providerFee += t.providerFee;
    cur.feeAdmin += t.feeAdmin;
    cur.principal += t.principal;
    byCategoryMap.set(t.category, cur);
  }

  // Pass-through accounting summary (see buildPpobCollectionLines/buildPpobSettlementLines in
  // lib/ppob/engine.ts): totalNominal/totalPrincipal describe the THIRD-PARTY transaction value —
  // money that passes through NexBill's books but is never NexBill's own revenue — while
  // totalFeeAdmin is the only figure that is. totalSettlement/totalOutstandingPayable track how
  // much of totalPrincipal has actually been paid out to the provider vs. still owed.
  const settled = active.filter((t) => t.settlementStatus === "settled");
  const pending = active.filter((t) => t.settlementStatus === "pending");
  const summary = {
    totalTransactions: transactions.length,
    activeTransactions: active.length,
    reversedTransactions: transactions.length - active.length,
    totalNominal: active.reduce((s, t) => s + t.nominal, 0), // face value of the underlying product — informational, third-party value
    totalModal: active.reduce((s, t) => s + t.modal, 0),
    totalProviderFee: active.reduce((s, t) => s + t.providerFee, 0), // informational only — folded into totalPrincipal, no longer booked as a P&L expense
    totalPrincipal: active.reduce((s, t) => s + t.principal, 0), // = totalModal + totalProviderFee — the pass-through liability amount, NEVER revenue
    totalFeeAdmin: active.reduce((s, t) => s + t.feeAdmin, 0), // Admin Fee/Margin — the ONLY component that is NexBill revenue (flows to P&L)
    totalUangMasuk: active.reduce((s, t) => s + t.uangMasuk, 0), // = totalPrincipal + totalFeeAdmin — what customers actually paid
    totalSettlement: settled.reduce((s, t) => s + t.settlementAmount, 0), // principal already paid out to the provider
    totalOutstandingPayable: pending.reduce((s, t) => s + t.principal, 0), // principal collected but not yet settled — should be Rp0 under the current always-auto-settle flow; nonzero only flags a future deferred-settlement transaction awaiting payment
    byCategory: Array.from(byCategoryMap.entries()).map(([category, v]) => ({ category, ...v })),
  };

  if (!reconcilePpobSummary(summary) && process.env.NODE_ENV !== "production") {
    // Tripwire only — every figure above is summed straight off stored rows with no independent
    // second computation, so this should be unreachable barring a data-migration edge case.
    console.error("[ppob] summary reconciliation failed", summary);
  }

  return { transactions, summary };
}

/**
 * Pure reconciliation contract for the PPOB pass-through model (same pattern as reconcileSales in
 * lib/reports/transactions.ts and computeJournalBalance in accounting/journal.ts): given a summary
 * object, verifies the two identities the whole feature depends on —
 *   totalPrincipal + totalFeeAdmin = totalUangMasuk       (nothing lost/gained in the split)
 *   totalSettlement + totalOutstandingPayable = totalPrincipal   (every rupiah of principal is
 *     accounted for as either already paid to the provider or still owed — never both, never neither)
 * Exported and unit-tested so a future change to computePpobList's aggregation can't silently
 * break either invariant without a test failing immediately.
 */
export function reconcilePpobSummary(summary: { totalPrincipal: number; totalFeeAdmin: number; totalUangMasuk: number; totalSettlement: number; totalOutstandingPayable: number }): boolean {
  const splitOk = Math.abs(summary.totalUangMasuk - (summary.totalPrincipal + summary.totalFeeAdmin)) < 0.01;
  const settlementOk = Math.abs(summary.totalPrincipal - (summary.totalSettlement + summary.totalOutstandingPayable)) < 0.01;
  return splitOk && settlementOk;
}

export async function computePpobSummary(outletId: string, from?: string, to?: string) {
  const { summary } = await computePpobList({ outletId, from, to });
  const saldoFastpay = await getFastpaySaldoBalance(outletId);
  return { ...summary, saldoFastpay };
}
