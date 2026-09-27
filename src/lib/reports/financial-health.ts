import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeBalanceSheet, computeProfitLoss } from "@/lib/accounting/reports";
import { computeRentalReport } from "@/lib/reports/operational";
import { daysInRange } from "@/lib/reports/range";

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
  // Target is MONTHLY; the selected period may be a week or a quarter. Compare against the target
  // prorated to the period's days (30.4 days/month) and against operating revenue (not other income).
  const days = daysInRange(from, to);
  const salesTargetForPeriod = salesTargetMonthly && salesTargetMonthly > 0 ? (salesTargetMonthly * days) / 30.4 : null;
  const bepAchievementPercent = salesTargetForPeriod ? (pl.netRevenue / salesTargetForPeriod) * 100 : null;

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
  // Operating expenses = the 6xxx section of the multi-step Laba Rugi — NOT "all expenses − HPP",
  // which used to pull interest, asset-disposal losses and income tax (8xxx) into the opex ratio.
  const totalCogs = pl.totalCogs;
  const operatingExpense = pl.sections.operatingExpense.total;
  const opexRatioPercent = pl.netRevenue > 0 ? (operatingExpense / pl.netRevenue) * 100 : null;
  const cogsRatioPercent = pl.netRevenue > 0 ? (totalCogs / pl.netRevenue) * 100 : null;
  // Unit utilization: total rented minutes across all units / total theoretically-available
  // minutes in the period (unitCount * days * 24h) — an upper-bound approximation assuming units
  // could be rented around the clock, not actual posted open-hours (this app doesn't track
  // per-outlet operating hours). Treat as a relative/trend indicator, not a precise figure.
  const totalMinutesUsed = rental.totalMinutes;
  const availableMinutes = rental.unitCount * days * 24 * 60;
  const unitUtilizationPercent = rental.unitCount > 0 ? (totalMinutesUsed / availableMinutes) * 100 : null;

  return {
    from,
    to,
    profitability: { grossMarginPercent, netMarginPercent, salesTargetMonthly, salesTargetForPeriod, bepAchievementPercent, totalRevenue: pl.totalRevenue, netRevenue: pl.netRevenue, days },
    liquidity: { currentAssets, cashAndBank, currentLiabilities, currentRatio, cashRatio },
    efficiency: { operatingExpense, opexRatioPercent, cogsRatioPercent, unitUtilizationPercent, unitCount: rental.unitCount },
  };
}
