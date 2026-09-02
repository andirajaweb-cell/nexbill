import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeBalanceSheet, computeProfitLoss } from "@/lib/accounting/reports";
import { computeRentalReport } from "@/lib/reports/operational";

/**
 * Financial health ratios for the Reports & Analytics > "Kesehatan Keuangan" tab — three
 * categories the user asked for: profitability, liquidity, and operational efficiency. Built
 * entirely from data this app already computes elsewhere (Balance Sheet, P&L, Rental report,
 * the outlet's own BEP target) rather than inventing a parallel accounting model.
 *
 * All percentage/ratio fields are null (not 0) when the denominator is zero or the required
 * input isn't set (e.g. no salesTargetMonthly, no current liabilities yet) — callers must
 * render "-" rather than a misleading 0% in that case.
 */
export async function computeFinancialHealth(outletId: string, from: string, to: string) {
  const [pl, balanceSheet, rental, [outlet]] = await Promise.all([
    computeProfitLoss(outletId, from, to),
    computeBalanceSheet(outletId, to),
    computeRentalReport(outletId, from, to),
    db.select({ salesTargetMonthly: outlets.salesTargetMonthly }).from(outlets).where(eq(outlets.id, outletId)).limit(1),
  ]);

  // --- Profitabilitas ---
  const grossMarginPercent = pl.netRevenue > 0 ? (pl.grossProfit / pl.netRevenue) * 100 : null;
  const netMarginPercent = pl.netRevenue > 0 ? (pl.netProfit / pl.netRevenue) * 100 : null;
  const salesTargetMonthly = outlet?.salesTargetMonthly ?? null;
  const bepAchievementPercent = salesTargetMonthly && salesTargetMonthly > 0 ? (pl.totalRevenue / salesTargetMonthly) * 100 : null;

  // --- Likuiditas --- (COA convention: "11xx" = current assets, "111x/112x/113x" = cash/bank/
  // digital payment specifically, "21xx" = current liabilities — see seedChartOfAccounts in
  // lib/accounting/coa.ts. Header rows carry no direct journal postings so summing them in is safe.)
  const currentAssets = balanceSheet.assets.filter((a) => a.code.startsWith("11")).reduce((s, a) => s + a.balance, 0);
  const cashAndBank = balanceSheet.assets
    .filter((a) => a.code.startsWith("111") || a.code.startsWith("112") || a.code.startsWith("113"))
    .reduce((s, a) => s + a.balance, 0);
  const currentLiabilities = balanceSheet.liabilities.filter((a) => a.code.startsWith("21")).reduce((s, a) => s + a.balance, 0);
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : null;
  const cashRatio = currentLiabilities > 0 ? cashAndBank / currentLiabilities : null;

  // --- Efisiensi Operasional ---
  // computeProfitLoss() computes totalCogs internally (5xxx-coded expense accounts) but doesn't
  // return it directly — same filter reapplied here against the `expense` rows it does return.
  const totalCogs = pl.expense.filter((r) => r.code.startsWith("5")).reduce((s, r) => s + r.balance, 0);
  const operatingExpense = pl.totalExpense - totalCogs;
  const opexRatioPercent = pl.netRevenue > 0 ? (operatingExpense / pl.netRevenue) * 100 : null;
  const cogsRatioPercent = pl.netRevenue > 0 ? (totalCogs / pl.netRevenue) * 100 : null;
  // Unit utilization: total rented minutes across all units / total theoretically-available
  // minutes in the period (unitCount * days * 24h) — an upper-bound approximation assuming units
  // could be rented around the clock, not actual posted open-hours (this app doesn't track
  // per-outlet operating hours). Treat as a relative/trend indicator, not a precise figure.
  const days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1);
  const totalMinutesUsed = rental.perUnit.reduce((s, u) => s + u.avgDurationMinutes * u.sessionsCount, 0);
  const availableMinutes = rental.unitCount * days * 24 * 60;
  const unitUtilizationPercent = rental.unitCount > 0 ? (totalMinutesUsed / availableMinutes) * 100 : null;

  return {
    from,
    to,
    profitability: { grossMarginPercent, netMarginPercent, salesTargetMonthly, bepAchievementPercent, totalRevenue: pl.totalRevenue },
    liquidity: { currentAssets, cashAndBank, currentLiabilities, currentRatio, cashRatio },
    efficiency: { operatingExpense, opexRatioPercent, cogsRatioPercent, unitUtilizationPercent, unitCount: rental.unitCount },
  };
}
