import { db } from "@/db/client";
import { expenses, accounts, costCenters, suppliers, rentalUnits, outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeProfitLoss } from "@/lib/accounting/reports";

/** Only "approved"/"paid" expenses represent real recognized spend — draft/pending/rejected/cancelled never posted a journal. */
const RECOGNIZED = new Set(["approved", "paid"]);

async function loadRecognizedExpenses(outletId: string, from?: string, to?: string) {
  const rows = await db.select().from(expenses).where(eq(expenses.outletId, outletId));
  return rows.filter((e) => {
    if (!RECOGNIZED.has(e.status)) return false;
    if (from && e.expenseDate < from) return false;
    if (to && e.expenseDate > to) return false;
    return true;
  });
}

function sumOf(rows: typeof expenses.$inferSelect[]) {
  return rows.reduce((s, e) => s + e.amount + (e.taxAmount ?? 0), 0);
}

function groupSum<T>(rows: typeof expenses.$inferSelect[], keyFn: (e: typeof expenses.$inferSelect) => T, labelFn: (key: T) => string) {
  const map = new Map<string, { key: T; label: string; amount: number; count: number }>();
  for (const e of rows) {
    const key = keyFn(e);
    const mapKey = String(key);
    const cur = map.get(mapKey) ?? { key, label: labelFn(key), amount: 0, count: 0 };
    cur.amount += e.amount + (e.taxAmount ?? 0);
    cur.count += 1;
    map.set(mapKey, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
}

/**
 * Full Expense report set — Detail, by Category/Account/Supplier/Payment
 * Method/Branch/Cost Center, Expense vs Revenue, and Trend — all derived from
 * the same recognized-expense rowset for one outlet/date-range, matching the
 * request's 9 report views.
 */
export async function computeExpenseReport(outletId: string, from?: string, to?: string) {
  const [rows, accountRows, centerRows, supplierRows, unitRows, outletRow, pl] = await Promise.all([
    loadRecognizedExpenses(outletId, from, to),
    db.select().from(accounts).where(eq(accounts.outletId, outletId)),
    db.select().from(costCenters).where(eq(costCenters.outletId, outletId)),
    db.select().from(suppliers).where(eq(suppliers.outletId, outletId)),
    db.select().from(rentalUnits).where(eq(rentalUnits.outletId, outletId)),
    db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1),
    computeProfitLoss(outletId, from, to),
  ]);

  const accountName = new Map(accountRows.map((a) => [a.id, `${a.code} ${a.name}`]));
  const centerName = new Map(centerRows.map((c) => [c.id, c.name]));
  const supplierName = new Map(supplierRows.map((s) => [s.id, s.name]));
  const unitName = new Map(unitRows.map((u) => [u.id, u.name]));
  const outletName = outletRow[0]?.name ?? outletId;

  const byCategory = groupSum(rows, (e) => e.category, (k) => k || "Tanpa kategori");
  const byAccount = groupSum(rows, (e) => e.accountId, (k) => accountName.get(k) ?? "Akun tidak diketahui");
  const bySupplier = groupSum(
    rows.filter((e) => e.supplierId || e.payeeName),
    (e) => e.supplierId ?? `payee:${e.payeeName}`,
    (k) => (k.startsWith("payee:") ? k.slice(6) : supplierName.get(k) ?? k)
  );
  const paymentMethodLabels: Record<string, string> = { cash: "Cash", bank: "Bank", transfer: "Transfer", qris: "QRIS" };
  const byPaymentMethod = groupSum(
    rows.filter((e) => e.paymentMethod),
    (e) => e.paymentMethod ?? "",
    (k) => paymentMethodLabels[k] ?? k
  );
  const byBranch = [{ key: outletId, label: outletName, amount: sumOf(rows), count: rows.length }];
  const byCostCenter = groupSum(
    rows.filter((e) => e.costCenterId || e.rentalUnitId),
    (e) => e.costCenterId ?? `unit:${e.rentalUnitId}`,
    (k) => (k.startsWith("unit:") ? `Unit ${unitName.get(k.slice(5)) ?? k.slice(5)}` : centerName.get(k) ?? k)
  );

  const dayMap = new Map<string, number>();
  for (const e of rows) {
    const day = e.expenseDate.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + e.amount + (e.taxAmount ?? 0));
  }
  const trend = Array.from(dayMap.entries()).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));

  const detail = rows
    .map((e) => ({
      ...e,
      accountLabel: accountName.get(e.accountId) ?? "-",
      costCenterLabel: e.costCenterId ? centerName.get(e.costCenterId) ?? "-" : null,
      rentalUnitLabel: e.rentalUnitId ? unitName.get(e.rentalUnitId) ?? "-" : null,
      supplierLabel: e.supplierId ? supplierName.get(e.supplierId) ?? "-" : e.payeeName,
    }))
    .sort((a, b) => b.expenseDate.localeCompare(a.expenseDate));

  const totalExpense = sumOf(rows);

  return {
    from,
    to,
    totalExpense,
    totalRevenue: pl.totalRevenue,
    expenseToRevenueRatioPercent: pl.totalRevenue > 0 ? Math.round((totalExpense / pl.totalRevenue) * 1000) / 10 : null,
    netProfit: pl.netProfit,
    detail,
    byCategory,
    byAccount,
    bySupplier,
    byPaymentMethod,
    byBranch,
    byCostCenter,
    trend,
  };
}

/** Dashboard summary cards: Total Hari Ini, Bulan Ini, Outstanding, Pending Approval, Paid, by Category, by Branch, Trend. */
export async function computeExpenseDashboard(outletId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const allRows = await db.select().from(expenses).where(eq(expenses.outletId, outletId));
  const recognized = allRows.filter((e) => RECOGNIZED.has(e.status));

  const totalToday = sumOf(recognized.filter((e) => e.expenseDate >= todayStart.toISOString()));
  const totalMonth = sumOf(recognized.filter((e) => e.expenseDate >= monthStart.toISOString()));
  const outstanding = sumOf(allRows.filter((e) => e.recordAsPayable && e.status === "approved"));
  const pendingRows = allRows.filter((e) => e.status === "pending_approval");
  const pendingApprovalCount = pendingRows.length;
  const pendingApprovalAmount = sumOf(pendingRows);
  const paidThisMonth = sumOf(allRows.filter((e) => e.status === "paid" && (e.paidAt ?? "") >= monthStart.toISOString()));

  const monthRows = recognized.filter((e) => e.expenseDate >= monthStart.toISOString());
  const accountRows = await db.select().from(accounts).where(eq(accounts.outletId, outletId));
  const accountName = new Map(accountRows.map((a) => [a.id, a.name]));
  const byCategory = groupSum(monthRows, (e) => e.accountId, (k) => accountName.get(k) ?? "Lainnya").slice(0, 8);

  const [outletRow] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const byBranch = [{ key: outletId, label: outletRow?.name ?? outletId, amount: totalMonth }];

  const trendRows = recognized.filter((e) => e.expenseDate >= thirtyDaysAgo.toISOString());
  const dayMap = new Map<string, number>();
  for (const e of trendRows) {
    const day = e.expenseDate.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + e.amount + (e.taxAmount ?? 0));
  }
  const trend = Array.from(dayMap.entries()).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));

  const dueSoon = allRows.filter((e) => e.recordAsPayable && e.status === "approved" && e.dueDate && e.dueDate <= new Date(now.getTime() + 3 * 86400000).toISOString());

  return {
    totalToday,
    totalMonth,
    outstanding,
    pendingApprovalCount,
    pendingApprovalAmount,
    paidThisMonth,
    byCategory,
    byBranch,
    trend,
    dueSoonCount: dueSoon.length,
    dueSoon: dueSoon.map((e) => ({ id: e.id, expenseNumber: e.expenseNumber, description: e.description, amount: e.amount, dueDate: e.dueDate })),
  };
}
