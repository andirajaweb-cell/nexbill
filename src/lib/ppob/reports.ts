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
  const byCategoryMap = new Map<string, { count: number; nominal: number; providerFee: number; feeAdmin: number }>();
  for (const t of active) {
    const cur = byCategoryMap.get(t.category) ?? { count: 0, nominal: 0, providerFee: 0, feeAdmin: 0 };
    cur.count += 1;
    cur.nominal += t.nominal;
    cur.providerFee += t.providerFee;
    cur.feeAdmin += t.feeAdmin;
    byCategoryMap.set(t.category, cur);
  }

  const summary = {
    totalTransactions: transactions.length,
    activeTransactions: active.length,
    reversedTransactions: transactions.length - active.length,
    totalNominal: active.reduce((s, t) => s + t.nominal, 0),
    totalModal: active.reduce((s, t) => s + t.modal, 0),
    totalProviderFee: active.reduce((s, t) => s + t.providerFee, 0), // beban biaya Fastpay
    totalFeeAdmin: active.reduce((s, t) => s + t.feeAdmin, 0), // margin bersih (keuntungan)
    totalUangMasuk: active.reduce((s, t) => s + t.uangMasuk, 0),
    byCategory: Array.from(byCategoryMap.entries()).map(([category, v]) => ({ category, ...v })),
  };

  return { transactions, summary };
}

export async function computePpobSummary(outletId: string, from?: string, to?: string) {
  const { summary } = await computePpobList({ outletId, from, to });
  const saldoFastpay = await getFastpaySaldoBalance(outletId);
  return { ...summary, saldoFastpay };
}
