import { db } from "@/db/client";
import { payments, orders, expenses, purchasePayments, purchaseInvoices } from "@/db/schema";
import { sql, inArray } from "drizzle-orm";

export interface CashFlowResult {
  from?: string;
  to?: string;
  totalIn: number;
  totalOut: number;
  netCashFlow: number;
  inByCategory: { category: string; amount: number }[];
  outByCategory: { category: string; amount: number }[];
  byDay: { date: string; in: number; out: number; net: number }[];
}

/**
 * Direct-method cash flow: all successful payments (any method — cash, QRIS,
 * e-wallet, transfer all eventually settle to a cash/bank account) count as
 * cash in; expenses and supplier purchase payments count as cash out.
 * This is a simplified operating cash flow (no separate investing/financing
 * sections yet — fine for a single-outlet business with no debt/equity
 * transactions beyond what's already in the ledger).
 */
export async function computeCashFlow(outletId: string, from?: string, to?: string): Promise<CashFlowResult> {
  const outletOrders = await db.select({ id: orders.id }).from(orders).where(sql`${orders.outletId} = ${outletId}`);
  const orderIds = outletOrders.map((o) => o.id);

  const conditions = [sql`${payments.status} = 'success'`];
  if (orderIds.length) conditions.push(inArray(payments.orderId, orderIds));
  else conditions.push(sql`1 = 0`);
  if (from) conditions.push(sql`${payments.paidAt} >= ${from}`);
  if (to) conditions.push(sql`${payments.paidAt} <= ${to}`);

  const successPayments = orderIds.length ? await db.select().from(payments).where(sql.join(conditions, sql` AND `)) : [];

  // Only "paid" expenses actually moved cash — draft/pending_approval/rejected/cancelled (incl.
  // voided-back-to-cancelled) never posted a journal, and bucket by paidAt (when cash actually
  // left), not expenseDate (which can be an earlier recognition/invoice date for AP expenses).
  const expenseConditions = [sql`${expenses.outletId} = ${outletId}`, sql`${expenses.status} = 'paid'`];
  if (from) expenseConditions.push(sql`${expenses.paidAt} >= ${from}`);
  if (to) expenseConditions.push(sql`${expenses.paidAt} <= ${to}`);
  const expenseRows = await db.select().from(expenses).where(sql.join(expenseConditions, sql` AND `));

  const outletInvoices = await db.select({ id: purchaseInvoices.id }).from(purchaseInvoices).where(sql`${purchaseInvoices.outletId} = ${outletId}`);
  const invoiceIds = outletInvoices.map((i) => i.id);
  const purchasePaymentConditions = [];
  if (invoiceIds.length) purchasePaymentConditions.push(inArray(purchasePayments.purchaseInvoiceId, invoiceIds));
  else purchasePaymentConditions.push(sql`1 = 0`);
  if (from) purchasePaymentConditions.push(sql`${purchasePayments.paidAt} >= ${from}`);
  if (to) purchasePaymentConditions.push(sql`${purchasePayments.paidAt} <= ${to}`);
  const purchasePaymentRows = invoiceIds.length ? await db.select().from(purchasePayments).where(sql.join(purchasePaymentConditions, sql` AND `)) : [];

  const totalIn = successPayments.reduce((s, p) => s + p.amount, 0);
  const totalOutExpenses = expenseRows.reduce((s, e) => s + e.amount + (e.taxAmount ?? 0), 0);
  const totalOutPurchases = purchasePaymentRows.reduce((s, p) => s + p.amount, 0);
  const totalOut = totalOutExpenses + totalOutPurchases;

  const inByCategoryMap = new Map<string, number>();
  for (const p of successPayments) {
    const key = `Penjualan (${p.method})`;
    inByCategoryMap.set(key, (inByCategoryMap.get(key) ?? 0) + p.amount);
  }

  const outByCategoryMap = new Map<string, number>();
  for (const e of expenseRows) {
    outByCategoryMap.set(e.category, (outByCategoryMap.get(e.category) ?? 0) + e.amount + (e.taxAmount ?? 0));
  }
  if (totalOutPurchases > 0) {
    outByCategoryMap.set("Pembayaran Supplier", (outByCategoryMap.get("Pembayaran Supplier") ?? 0) + totalOutPurchases);
  }

  const dayMap = new Map<string, { in: number; out: number }>();
  const dayKey = (iso: string) => iso.slice(0, 10);
  for (const p of successPayments) {
    const k = dayKey(p.paidAt ?? p.createdAt);
    const cur = dayMap.get(k) ?? { in: 0, out: 0 };
    cur.in += p.amount;
    dayMap.set(k, cur);
  }
  for (const e of expenseRows) {
    const k = dayKey(e.paidAt ?? e.expenseDate);
    const cur = dayMap.get(k) ?? { in: 0, out: 0 };
    cur.out += e.amount + (e.taxAmount ?? 0);
    dayMap.set(k, cur);
  }
  for (const p of purchasePaymentRows) {
    const k = dayKey(p.paidAt);
    const cur = dayMap.get(k) ?? { in: 0, out: 0 };
    cur.out += p.amount;
    dayMap.set(k, cur);
  }

  const byDay = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, in: v.in, out: v.out, net: v.in - v.out }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    from,
    to,
    totalIn,
    totalOut,
    netCashFlow: totalIn - totalOut,
    inByCategory: Array.from(inByCategoryMap.entries()).map(([category, amount]) => ({ category, amount })),
    outByCategory: Array.from(outByCategoryMap.entries()).map(([category, amount]) => ({ category, amount })),
    byDay,
  };
}
