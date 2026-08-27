import { db } from "@/db/client";
import { accounts, journalLines, journalEntries } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  normalBalance: "debit" | "credit";
  parentId: string | null;
  isPostingAllowed: boolean;
  debit: number;
  credit: number;
  balance: number; // signed per normal balance
}

/**
 * Sum journal lines per account within [from, to] (inclusive, ISO date strings).
 *
 * IMPORTANT: this intentionally includes entries with status "void", not just
 * "posted". voidJournal() never deletes or excludes the original entry from
 * history (audit trail requirement) — it posts a *separate offsetting
 * reversal entry* and then marks the original as "void" purely as a status
 * label. If this query excluded status="void" entries, the original entry's
 * debits/credits would vanish from the sums while the reversal's debits/
 * credits would still count, leaving a lopsided balance instead of a clean
 * net-zero cancellation. Both entries must be summed together so they cancel
 * out exactly, which is what makes the reversal pattern correct.
 */
export async function computeTrialBalance(outletId: string, from?: string, to?: string): Promise<TrialBalanceRow[]> {
  const allAccounts = await db.select().from(accounts).where(eq(accounts.outletId, outletId));

  const conditions = [eq(journalEntries.outletId, outletId)];
  if (from) conditions.push(gte(journalEntries.entryDate, from));
  if (to) conditions.push(lte(journalEntries.entryDate, to));

  const rows = await db
    .select({
      accountId: journalLines.accountId,
      debit: sql<number>`sum(${journalLines.debit})`,
      credit: sql<number>`sum(${journalLines.credit})`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
    .where(and(...conditions))
    .groupBy(journalLines.accountId);

  const sums = new Map(rows.map((r) => [r.accountId, { debit: r.debit ?? 0, credit: r.credit ?? 0 }]));

  return allAccounts.map((acc) => {
    const sum = sums.get(acc.id) ?? { debit: 0, credit: 0 };
    const balance = acc.normalBalance === "debit" ? sum.debit - sum.credit : sum.credit - sum.debit;
    return {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      normalBalance: acc.normalBalance as "debit" | "credit",
      parentId: acc.parentId,
      isPostingAllowed: acc.isPostingAllowed,
      debit: sum.debit,
      credit: sum.credit,
      balance,
    };
  });
}

export interface TrialBalanceTreeRow extends TrialBalanceRow {
  depth: number;
  debit: number; // recomputed: for Header rows this is the recursive sum of postable descendants
  credit: number;
  balance: number;
}

/**
 * Rebuilds the same parent/child tree + recursive-subtotal logic the Trial
 * Balance UI uses client-side (Header rows show the sum of their postable
 * descendants), as a flat, depth-ordered list — so the xlsx/pdf export can
 * render the exact hierarchy the user sees on screen. When showZero is
 * false, rows (and their now-empty parents) whose recursive debit+credit
 * are both zero are dropped, matching "jika nol tampilan" (zero-balance
 * accounts hidden by default, shown when toggled).
 */
export function flattenTrialBalanceTree(rows: TrialBalanceRow[], showZero: boolean): TrialBalanceTreeRow[] {
  const byId = new Map(rows.map((r) => [r.accountId, r]));
  const childrenOf = new Map<string, TrialBalanceRow[]>();
  for (const r of rows) {
    const key = r.parentId ?? "__root__";
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(r);
  }
  for (const list of childrenOf.values()) list.sort((a, b) => a.code.localeCompare(b.code));

  const amountsCache = new Map<string, { debit: number; credit: number; balance: number }>();
  const computeAmounts = (id: string): { debit: number; credit: number; balance: number } => {
    if (amountsCache.has(id)) return amountsCache.get(id)!;
    const row = byId.get(id);
    let result: { debit: number; credit: number; balance: number };
    if (row?.isPostingAllowed) {
      result = { debit: row.debit, credit: row.credit, balance: row.balance };
    } else {
      const kids = childrenOf.get(id) ?? [];
      result = kids.reduce(
        (acc, k) => {
          const a = computeAmounts(k.accountId);
          return { debit: acc.debit + a.debit, credit: acc.credit + a.credit, balance: acc.balance + a.balance };
        },
        { debit: 0, credit: 0, balance: 0 }
      );
    }
    amountsCache.set(id, result);
    return result;
  };

  const out: TrialBalanceTreeRow[] = [];
  const visit = (r: TrialBalanceRow, depth: number) => {
    const amounts = computeAmounts(r.accountId);
    const isZero = amounts.debit === 0 && amounts.credit === 0;
    if (isZero && !showZero) return;
    out.push({ ...r, depth, debit: amounts.debit, credit: amounts.credit, balance: amounts.balance });
    for (const k of childrenOf.get(r.accountId) ?? []) visit(k, depth + 1);
  };
  for (const r of childrenOf.get("__root__") ?? []) visit(r, 0);
  return out;
}

export async function computeProfitLoss(outletId: string, from?: string, to?: string) {
  const trialBalance = await computeTrialBalance(outletId, from, to);

  const revenue = trialBalance.filter((r) => r.type === "revenue");
  const expense = trialBalance.filter((r) => r.type === "expense");

  const totalRevenue = revenue.reduce((s, r) => s + r.balance, 0);
  const totalExpense = expense.reduce((s, r) => s + r.balance, 0);

  // Gross Sales -> Discount -> Net Sales waterfall: 4910-4950 (CONTRA REVENUE, under header
  // 4900) are revenue-type accounts but always post as debits (see postSalesJournal's "Diskon
  // penjualan" line), so their `balance` (credit-normal: credit-debit) comes out negative —
  // totalRevenue above already nets them in automatically. Pull them out separately here so
  // the report can show Gross -> Discount -> Net instead of one flat net number.
  const contraRevenue = revenue.filter((r) => r.code.startsWith("49") && r.code !== "4900" && r.isPostingAllowed);
  const totalDiscount = contraRevenue.reduce((s, r) => s + Math.abs(r.balance), 0);
  const grossRevenue = totalRevenue + totalDiscount;
  const netRevenue = totalRevenue;

  // COGS now spans the whole 5xxx family (5110 Food COGS, 5120 Beverage COGS, ...)
  // instead of one lumped "5000" code — sum every account under that top-level digit.
  const totalCogs = expense.filter((r) => r.code.startsWith("5")).reduce((s, r) => s + r.balance, 0);
  const grossProfit = totalRevenue - totalCogs;
  const netProfit = totalRevenue - totalExpense;

  return {
    from,
    to,
    revenue,
    expense,
    totalRevenue,
    totalExpense,
    grossRevenue,
    totalDiscount,
    netRevenue,
    contraRevenue,
    grossProfit,
    netProfit,
  };
}

export async function computeBalanceSheet(outletId: string, asOf?: string) {
  const trialBalance = await computeTrialBalance(outletId, undefined, asOf);

  const assets = trialBalance.filter((r) => r.type === "asset");
  const liabilities = trialBalance.filter((r) => r.type === "liability");
  const equity = trialBalance.filter((r) => r.type === "equity");

  // Retained earnings = cumulative net profit not yet closed to equity (computed live, not requiring period-close).
  const pl = await computeProfitLoss(outletId, undefined, asOf);

  const totalAssets = assets.reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.balance, 0);
  const totalEquityBooked = equity.reduce((s, r) => s + r.balance, 0);
  const totalEquityWithRetainedEarnings = totalEquityBooked + pl.netProfit;

  return {
    asOf,
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquityBooked,
    currentPeriodNetProfit: pl.netProfit,
    totalEquityWithRetainedEarnings,
    balances: Math.abs(totalAssets - (totalLiabilities + totalEquityWithRetainedEarnings)) < 1,
  };
}
