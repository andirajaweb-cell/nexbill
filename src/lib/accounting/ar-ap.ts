import { db } from "@/db/client";
import { receivables, customers, purchaseInvoices, suppliers, expenses } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";

const round = (n: number) => Math.round(n * 100) / 100;

type AgingBucket = "current" | "d1_30" | "d31_60" | "d60plus";

/** Buckets by days overdue past dueDate (or days-open since createdAt if no dueDate was set). Negative/zero days = not yet due = "current". */
function agingBucketFor(referenceDateIso: string | null, createdAtIso: string): { bucket: AgingBucket; daysOverdue: number } {
  const base = referenceDateIso ?? createdAtIso;
  const daysOverdue = Math.floor((Date.now() - new Date(base).getTime()) / 86400000);
  if (daysOverdue <= 0) return { bucket: "current", daysOverdue: 0 };
  if (daysOverdue <= 30) return { bucket: "d1_30", daysOverdue };
  if (daysOverdue <= 60) return { bucket: "d31_60", daysOverdue };
  return { bucket: "d60plus", daysOverdue };
}

function emptyAgingBuckets(): Record<AgingBucket, number> {
  return { current: 0, d1_30: 0, d31_60: 0, d60plus: 0 };
}

/**
 * Accounts Receivable — reads the `receivables` table (populated by
 * postSalesJournal in src/lib/accounting/postings.ts whenever an order isn't
 * fully paid at recognition time) joined with customer names, with an aging
 * breakdown so the owner can see who owes how much and how overdue it is.
 */
export async function computeAccountsReceivable(outletId: string) {
  const [allRows, customerRows] = await Promise.all([
    db.select().from(receivables).where(eq(receivables.outletId, outletId)),
    db.select().from(customers).where(eq(customers.outletId, outletId)),
  ]);
  const customerName = new Map(customerRows.map((c) => [c.id, c.name ?? c.phone ?? "-"]));

  const open = allRows.filter((r) => r.status !== "paid" && r.status !== "written_off");
  const agingBuckets = emptyAgingBuckets();
  const detail = open.map((r) => {
    const outstanding = round(r.amount - r.paidAmount);
    const { bucket, daysOverdue } = agingBucketFor(r.dueDate, r.createdAt);
    agingBuckets[bucket] += outstanding;
    return {
      id: r.id,
      customerId: r.customerId,
      customerName: r.customerId ? customerName.get(r.customerId) ?? "-" : "Walk-in",
      orderId: r.orderId,
      amount: r.amount,
      paidAmount: r.paidAmount,
      outstanding,
      dueDate: r.dueDate,
      status: r.status,
      daysOverdue,
      agingBucket: bucket,
      createdAt: r.createdAt,
    };
  });
  detail.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const byCustomerMap = new Map<string, { customerId: string | null; customerName: string; outstanding: number; count: number }>();
  for (const r of detail) {
    const key = r.customerId ?? "walkin";
    const cur = byCustomerMap.get(key) ?? { customerId: r.customerId, customerName: r.customerName, outstanding: 0, count: 0 };
    cur.outstanding += r.outstanding;
    cur.count += 1;
    byCustomerMap.set(key, cur);
  }
  const byCustomer = Array.from(byCustomerMap.values()).sort((a, b) => b.outstanding - a.outstanding);

  return {
    totalOutstanding: round(detail.reduce((s, r) => s + r.outstanding, 0)),
    count: detail.length,
    detail,
    byCustomer,
    agingBuckets,
  };
}

export interface PayableRow {
  type: "purchase_invoice" | "expense";
  id: string;
  payee: string;
  amount: number;
  dueDate: string | null;
  reference: string;
  createdAt: string;
  agingBucket: AgingBucket;
  daysOverdue: number;
}

/**
 * Accounts Payable — merges the two sources of "money we owe" that already
 * exist in the system rather than duplicating them into a new table:
 * purchaseInvoices (supplier debt, COA 2000 Hutang Usaha) and expenses
 * recorded as payable that are approved-but-not-yet-paid (COA 2100 Hutang
 * Lain-lain). Settling either kind still goes through their own existing
 * pay endpoints (/api/purchase-invoices/[id]/pay, /api/expenses/[id]/pay) —
 * this is a read-only consolidated view + aging, not a new payment path.
 */
export async function computeAccountsPayable(outletId: string): Promise<{
  totalOutstanding: number;
  count: number;
  detail: PayableRow[];
  byPayee: { payee: string; outstanding: number; count: number }[];
  agingBuckets: Record<AgingBucket, number>;
}> {
  const [invoices, supplierRows, payableExpenses] = await Promise.all([
    db.select().from(purchaseInvoices).where(and(eq(purchaseInvoices.outletId, outletId), ne(purchaseInvoices.status, "paid"))),
    db.select().from(suppliers).where(eq(suppliers.outletId, outletId)),
    db.select().from(expenses).where(and(eq(expenses.outletId, outletId), eq(expenses.recordAsPayable, true), eq(expenses.status, "approved"))),
  ]);
  const supplierName = new Map(supplierRows.map((s) => [s.id, s.name]));

  const agingBuckets = emptyAgingBuckets();
  const detail: PayableRow[] = [];

  for (const inv of invoices) {
    const outstanding = round(inv.amount - inv.paidAmount);
    if (outstanding <= 0) continue;
    const { bucket, daysOverdue } = agingBucketFor(inv.dueDate, inv.createdAt);
    agingBuckets[bucket] += outstanding;
    detail.push({
      type: "purchase_invoice",
      id: inv.id,
      payee: supplierName.get(inv.supplierId) ?? "Supplier",
      amount: outstanding,
      dueDate: inv.dueDate,
      reference: inv.invoiceNumber ?? `PINV-${inv.id.slice(0, 8)}`,
      createdAt: inv.createdAt,
      agingBucket: bucket,
      daysOverdue,
    });
  }

  for (const e of payableExpenses) {
    const amount = round(e.amount + (e.taxAmount ?? 0));
    const { bucket, daysOverdue } = agingBucketFor(e.dueDate, e.createdAt);
    agingBuckets[bucket] += amount;
    detail.push({
      type: "expense",
      id: e.id,
      payee: e.payeeName || e.category,
      amount,
      dueDate: e.dueDate,
      reference: e.expenseNumber,
      createdAt: e.createdAt,
      agingBucket: bucket,
      daysOverdue,
    });
  }

  detail.sort((a, b) => b.daysOverdue - a.daysOverdue);

  const byPayeeMap = new Map<string, { payee: string; outstanding: number; count: number }>();
  for (const r of detail) {
    const cur = byPayeeMap.get(r.payee) ?? { payee: r.payee, outstanding: 0, count: 0 };
    cur.outstanding += r.amount;
    cur.count += 1;
    byPayeeMap.set(r.payee, cur);
  }
  const byPayee = Array.from(byPayeeMap.values()).sort((a, b) => b.outstanding - a.outstanding);

  return {
    totalOutstanding: round(detail.reduce((s, r) => s + r.amount, 0)),
    count: detail.length,
    detail,
    byPayee,
    agingBuckets,
  };
}
