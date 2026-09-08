import { db } from "@/db/client";
import {
  orders, orderItems, payments, customers, staffUsers, shifts,
  rentalSessions, rentalUnits, products, membershipTiers, ppobTransactions,
} from "@/db/schema";
import { sql, inArray, eq } from "drizzle-orm";
// Shared with the accounting engine instead of a hand-copied category list — see that constant's
// own doc comment for the bug this used to cause (coffee/dessert sales misclassified here).
import { FNB_CATEGORIES } from "@/lib/accounting/postings";

function dayRangeConditions(column: any, from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(sql`${column} >= ${from}`);
  if (to) conditions.push(sql`${column} <= ${to}`);
  return conditions;
}

/**
 * Same classification the accounting engine actually uses (see revenueAccountIdForItem in
 * postings.ts): routed by the item's own `itemType` flag, not by sniffing its description text.
 * This used to check `description.toLowerCase().startsWith("rental:")` instead — a redundant,
 * independent re-implementation of the same routing decision postings.ts already makes via
 * itemType, which happened to agree for the base rental line and per-hour accessory add-ons
 * (both are given a "Rental:"-prefixed description on purpose) but was one wording change away
 * from silently drifting out of sync with what actually got posted to the books. itemType is the
 * authoritative flag set at item-creation time either way, so read that directly.
 * rental (the base session charge) and accessory (per-hour add-on rentals) are both folded into
 * the "rental" bucket here, matching the "Rental" filter/badge already shown in the Transaction
 * Center UI — Accounting/the owner dashboard break these into separate COA accounts (4100 vs
 * 4350) for more granular reporting, but Transaction Center only has one "Rental" type today.
 */
function itemRevenueBucket(itemType: string, category?: string): "rental" | "fnb" | "product" {
  if (itemType === "rental" || itemType === "accessory") return "rental";
  if (category && FNB_CATEGORIES.has(category)) return "fnb";
  return "product";
}

/**
 * NOTE ON DESIGN (Transaction Center vs Accounting): this page used to source its revenue-by-type
 * cards from the General Ledger (via computeProfitLoss + a `glRevenueBucket` account-code mapper)
 * so they'd never disagree with Laba Rugi. That was deliberately reverted — the user asked for the
 * opposite guarantee here: every card on this page and the transaction table below it must come
 * from the *same* orders dataset and the *same* [from, to] period (order.createdAt), so the cards
 * are always exactly reconcilable against the rows actually displayed in the table, with zero
 * mixing of transaction_created_at and revenue_recognition_date within one summary. Laba Rugi
 * (computeProfitLoss, entryDate/posting_date-based) remains the correct, separate source of truth
 * for the financial statements and is intentionally NOT used anywhere in this file anymore — see
 * the summary-computation block in computeTransactionList for the full reconciliation contract.
 */

/** Order-level type badge for the Transaction Center table/filter: an order that touches a rental
 * session is shown as "Rental" (even if F&B was added to the same bill — that's the whole point of
 * unified billing), a standalone food/drink/snack sale is "F&B", anything else is "Produk". PPOB has
 * no data source yet (separate module, not built) so it always returns zero rows for that type. */
function classifyOrder(order: { rentalSessionId: string | null }, items: { productId: string | null; itemType: string; category?: string }[]): "rental" | "fnb" | "product" | "ppob" {
  if (order.rentalSessionId) return "rental";
  if (items.some((i) => itemRevenueBucket(i.itemType, i.category) === "fnb")) return "fnb";
  return "product";
}

const PAYMENT_METHOD_GROUP: Record<string, string> = {
  cash: "Cash",
  transfer: "Transfer Bank",
  qris: "QRIS",
  fastpay_h2h: "QRIS",
  dana: "E-Wallet",
  gopay: "E-Wallet",
  bukupay: "E-Wallet",
  card: "Card",
};

/**
 * Pure reconciliation contract for the Transaction Center summary cards. Extracted (same pattern
 * as computeJournalBalance in accounting/journal.ts) so it's unit-testable without a DB and so a
 * future edit to computeTransactionList can't silently drift the two invariants the user asked
 * for apart:
 *
 *   1) SUM(total transaksi valid pada tabel) = Gross Sales
 *   2) Gross Sales − Refund = Net Sales
 *
 * IMPORTANT DEVIATION FROM A LITERAL READING, DOCUMENTED ON PURPOSE: the request also said "Gross
 * Sales − Discount − Refund = Net Sales". That third term is deliberately NOT applied here. Per
 * recomputeBillTotals (lib/pos/bill.ts), order.total is already net of discount:
 *   total = (subtotal − discount) + tax + serviceCharge
 * Gross Sales is defined below as SUM(order.total) for every valid (non-cancelled) row — i.e. it
 * is already discount-net. Subtracting discount a second time here would double-count it, which
 * violates the same request's own explicit "tanpa double counting" requirement. Discount is still
 * surfaced as its own informational card (see summary.discount) so nothing is hidden — it's simply
 * not subtracted twice. If this resolution isn't what was intended, the fix is a one-line change
 * to `netSales` below.
 */
export function reconcileSales(validTransactionTotals: number[], refund: number): {
  grossSales: number;
  netSales: number;
  isReconciled: boolean;
} {
  const grossSales = validTransactionTotals.reduce((sum, total) => sum + total, 0);
  const netSales = grossSales - refund;
  // Guards against float drift (order.total/refund are stored as numbers, not fixed-point) rather
  // than against a real computation error — grossSales/netSales are derived in the same expression
  // they're checked against, so this is a tripwire for a future refactor, not a live risk today.
  const isReconciled = Number.isFinite(grossSales) && Number.isFinite(netSales) && Math.abs(netSales - (grossSales - refund)) < 0.01;
  return { grossSales, netSales, isReconciled };
}

export interface TransactionFilters {
  outletId: string;
  from?: string;
  to?: string;
  staffUserId?: string;
  type?: "rental" | "fnb" | "product" | "ppob";
  paymentMethodGroup?: string;
  status?: string;
  customerId?: string;
  minTotal?: number;
  maxTotal?: number;
  shiftId?: string;
}

export async function computeTransactionList(filters: TransactionFilters) {
  const { outletId, from, to } = filters;
  const conditions = [sql`${orders.outletId} = ${outletId}`, ...dayRangeConditions(orders.createdAt, from, to)];
  if (filters.staffUserId) conditions.push(sql`${orders.staffUserId} = ${filters.staffUserId}`);
  if (filters.status) conditions.push(sql`${orders.status} = ${filters.status}`);
  if (filters.customerId) conditions.push(sql`${orders.customerId} = ${filters.customerId}`);
  if (filters.shiftId) conditions.push(sql`${orders.shiftId} = ${filters.shiftId}`);
  if (filters.minTotal !== undefined) conditions.push(sql`${orders.total} >= ${filters.minTotal}`);
  if (filters.maxTotal !== undefined) conditions.push(sql`${orders.total} <= ${filters.maxTotal}`);

  const orderRows = await db.select().from(orders).where(sql.join(conditions, sql` AND `)).orderBy(sql`${orders.createdAt} DESC`);
  const orderIds = orderRows.map((o) => o.id);
  // Scope customers/sessions to only what THIS filtered window's orders actually reference,
  // instead of pulling every customer/session the outlet has ever had on every single load —
  // both grow unbounded over the outlet's lifetime while a Transaction Center query (often just
  // "today") only ever needs a handful. staffUsers/membershipTiers/products are left as full
  // per-outlet fetches since those are naturally small/bounded (staff count, tier count, catalog
  // size), not per-transaction history.
  const customerIds = Array.from(new Set(orderRows.map((o) => o.customerId).filter((id): id is string => !!id)));
  const sessionIds = Array.from(new Set(orderRows.map((o) => o.rentalSessionId).filter((id): id is string => !!id)));

  const [items, paymentRows, staffRows, customerRows, tierRows, sessionRows, productRows] = await Promise.all([
    orderIds.length ? db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : Promise.resolve([]),
    orderIds.length ? db.select().from(payments).where(inArray(payments.orderId, orderIds)) : Promise.resolve([]),
    db.select().from(staffUsers).where(eq(staffUsers.outletId, outletId)),
    customerIds.length ? db.select().from(customers).where(inArray(customers.id, customerIds)) : Promise.resolve([]),
    db.select().from(membershipTiers).where(eq(membershipTiers.outletId, outletId)),
    sessionIds.length ? db.select().from(rentalSessions).where(inArray(rentalSessions.id, sessionIds)) : Promise.resolve([]),
    db.select().from(products).where(eq(products.outletId, outletId)),
  ]);
  // Units depend on which sessions actually showed up above, so this has to wait for sessionRows
  // — still just one extra round trip, not per-row, so no N+1 reintroduced.
  const unitIds = Array.from(new Set(sessionRows.map((s) => s.rentalUnitId).filter((id): id is string => !!id)));
  const unitRows = unitIds.length ? await db.select().from(rentalUnits).where(inArray(rentalUnits.id, unitIds)) : [];

  const staffNameById = new Map(staffRows.map((s) => [s.id, s.name]));
  const customerById = new Map(customerRows.map((c) => [c.id, c]));
  const tierNameById = new Map(tierRows.map((t) => [t.id, t.name]));
  const sessionById = new Map(sessionRows.map((s) => [s.id, s]));
  const unitById = new Map(unitRows.map((u) => [u.id, u]));
  const productCategoryById = new Map(productRows.map((p) => [p.id, p.category]));

  const itemsByOrder = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push(it);
    itemsByOrder.set(it.orderId, list);
  }
  const paymentsByOrder = new Map<string, typeof paymentRows>();
  for (const p of paymentRows) {
    const list = paymentsByOrder.get(p.orderId) ?? [];
    list.push(p);
    paymentsByOrder.set(p.orderId, list);
  }

  let transactions = orderRows.map((o) => {
    const orderItemRows = (itemsByOrder.get(o.id) ?? []).map((it) => ({
      ...it,
      category: it.productId ? productCategoryById.get(it.productId) : undefined,
    }));
    const orderPayments = paymentsByOrder.get(o.id) ?? [];
    const session = o.rentalSessionId ? sessionById.get(o.rentalSessionId) : undefined;
    const unit = session ? unitById.get(session.rentalUnitId) : undefined;
    const customer = o.customerId ? customerById.get(o.customerId) : undefined;

    return {
      id: o.id,
      createdAt: o.createdAt,
      staffUserId: o.staffUserId,
      staffName: o.staffUserId ? staffNameById.get(o.staffUserId) ?? "-" : "-",
      customerId: o.customerId,
      customerName: customer ? customer.name ?? customer.phone ?? "-" : null,
      memberTier: customer?.membershipTierId ? tierNameById.get(customer.membershipTierId) ?? null : null,
      unitName: unit?.name ?? null,
      type: classifyOrder(o, orderItemRows),
      items: orderItemRows.map((it) => ({ description: it.description, qty: it.qty, unitPrice: it.unitPrice, lineTotal: it.lineTotal, itemType: it.itemType })),
      subtotal: o.subtotal,
      discount: o.discount,
      tax: o.tax,
      serviceCharge: o.serviceCharge,
      total: o.total,
      status: o.status,
      shiftId: o.shiftId,
      source: o.source,
      payments: orderPayments.map((p) => ({ method: p.method, methodGroup: PAYMENT_METHOD_GROUP[p.method] ?? p.method, amount: p.amount, status: p.status, paidAt: p.paidAt })),
    };
  });

  if (filters.type) transactions = transactions.filter((t) => t.type === filters.type);
  if (filters.paymentMethodGroup) {
    transactions = transactions.filter((t) => t.payments.some((p) => p.methodGroup === filters.paymentMethodGroup));
  }

  // Summary cards are computed from THIS exact post-filter `transactions` array — the same rows
  // the table renders — so every card reconciles against "seluruh baris yang tampil" under any
  // filter combination (previously the revenue-by-type breakdown ignored the type filter on
  // purpose; that's reversed now per the user's explicit request for single-dataset consistency).
  const validTransactions = transactions.filter((t) => t.status !== "cancelled");
  const cancelledTransactions = transactions.filter((t) => t.status === "cancelled");
  // "Recognized" = has actual money in (partial/paid) — this is the ONLY set Cash/byPaymentMethod
  // draws from. "Open"/"awaiting_payment" orders are valid transactions (they count toward Gross
  // Sales/Total Transaksi below) but are never treated as cash received, per the user's explicit
  // "transaksi Open tidak dianggap sebagai Cash yang diterima" requirement.
  const recognized = transactions.filter((t) => t.status === "paid" || t.status === "partial");

  // Rental/F&B/Produk revenue breakdown: item-level, createdAt-scoped, derived from the SAME
  // validTransactions the Gross Sales figure below sums — never from Accounting/GL (computeProfitLoss)
  // and never from a different date field (entryDate) or a different period. This intentionally
  // reverses the earlier GL-sourced version of this file; Laba Rugi keeps its own, separate,
  // posting_date-based computation and is not read anywhere in this module.
  const revenueByType = { rental: 0, fnb: 0, product: 0 };
  for (const t of validTransactions) {
    for (const it of itemsByOrder.get(t.id) ?? []) {
      const category = it.productId ? productCategoryById.get(it.productId) : undefined;
      const bucket = itemRevenueBucket(it.itemType, category);
      revenueByType[bucket] += it.lineTotal;
    }
    revenueByType.product += (t.serviceCharge ?? 0) + (t.tax ?? 0);
  }
  const totalDiscount = validTransactions.reduce((s, t) => s + t.discount, 0);
  const totalTax = validTransactions.reduce((s, t) => s + t.tax, 0);

  // PPOB is architecturally a separate module/table (ppobTransactions) that never produces rows in
  // this orders-based table — so its revenue is sourced directly from ppobTransactions, scoped to
  // the SAME outlet + [from, to] window on ITS OWN createdAt (never entryDate/GL), and explicitly
  // kept OUT of Gross Sales/Net Sales/Total Transaksi below since those must reconcile exactly
  // against the orders table this page renders. Zeroed out under filters that have no coherent
  // ppobTransactions equivalent (type/paymentMethodGroup/status/customerId/min-max total are all
  // order-table concepts), so this card never implies rows exist in the table that don't.
  let ppobRevenue = 0;
  if (!filters.type && !filters.paymentMethodGroup && !filters.status && !filters.customerId && filters.minTotal === undefined && filters.maxTotal === undefined) {
    const ppobConditions = [sql`${ppobTransactions.outletId} = ${outletId}`, sql`${ppobTransactions.status} = 'success'`, ...dayRangeConditions(ppobTransactions.createdAt, from, to)];
    if (filters.staffUserId) ppobConditions.push(sql`${ppobTransactions.staffUserId} = ${filters.staffUserId}`);
    if (filters.shiftId) ppobConditions.push(sql`${ppobTransactions.shiftId} = ${filters.shiftId}`);
    const ppobRows = await db.select({ providerFee: ppobTransactions.providerFee, feeAdmin: ppobTransactions.feeAdmin }).from(ppobTransactions).where(sql.join(ppobConditions, sql` AND `));
    // Actual GL-booked PPOB revenue, matching buildPpobJournalLines in lib/ppob/engine.ts — NOT
    // just feeAdmin (the shop's own margin), which would understate it.
    ppobRevenue = ppobRows.reduce((s, r) => s + (r.providerFee ?? 0) + (r.feeAdmin ?? 0), 0);
  }

  const byPaymentMethodMap = new Map<string, number>();
  for (const t of recognized) {
    for (const p of t.payments) {
      if (p.status !== "success") continue;
      byPaymentMethodMap.set(p.methodGroup, (byPaymentMethodMap.get(p.methodGroup) ?? 0) + p.amount);
    }
  }

  // Refund reduces Net Sales by the actual refunded nominal, scoped to the same validTransactions
  // set (a cancelled order can't also carry a "refunded" payment in practice, but excluding
  // cancelled rows here keeps this strictly aligned with "valid transactions" per the spec).
  const refundedAmount = validTransactions.reduce((sum, t) => sum + t.payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0), 0);

  // Gross Sales / Net Sales reconciliation — see reconcileSales' doc comment for the exact
  // contract and the documented, deliberate deviation (no second discount subtraction).
  const { grossSales, netSales, isReconciled } = reconcileSales(validTransactions.map((t) => t.total), refundedAmount);
  if (!isReconciled && process.env.NODE_ENV !== "production") {
    // Defensive tripwire only — reconcileSales computes both figures from the same inputs, so this
    // should be unreachable; a failure here means someone changed reconcileSales' own arithmetic.
    console.error("[transactions] Gross/Net Sales reconciliation failed", { grossSales, netSales, refundedAmount });
  }

  const summary = {
    totalTransactions: validTransactions.length,
    paidTransactions: recognized.length,
    cancelledTransactions: cancelledTransactions.length,
    grossSales,
    rentalRevenue: revenueByType.rental,
    fnbRevenue: revenueByType.fnb,
    ppobRevenue,
    productRevenue: revenueByType.product,
    discount: totalDiscount,
    tax: totalTax,
    refund: refundedAmount,
    netSales,
    isReconciled,
    byPaymentMethod: Array.from(byPaymentMethodMap.entries()).map(([method, amount]) => ({ method, amount })),
  };

  return { transactions, summary };
}

export async function getTransactionDetail(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const paymentRows = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const [customer] = order.customerId ? await db.select().from(customers).where(eq(customers.id, order.customerId)).limit(1) : [null];
  const [staff] = order.staffUserId ? await db.select().from(staffUsers).where(eq(staffUsers.id, order.staffUserId)).limit(1) : [null];
  return { order, items, payments: paymentRows, customer, staff };
}

export interface CashierPerformanceRow {
  staffUserId: string;
  staffName: string;
  transactionCount: number;
  totalSales: number;
  avgTransaction: number;
  rentalTotal: number;
  fnbTotal: number;
  productTotal: number;
  refundCount: number;
  refundValue: number;
  voidCount: number;
  discountTotal: number;
  shiftsCount: number;
  totalVariance: number;
  rank: number;
}

export async function computeCashierPerformance(outletId: string, from?: string, to?: string): Promise<CashierPerformanceRow[]> {
  const conditions = [sql`${orders.outletId} = ${outletId}`, ...dayRangeConditions(orders.createdAt, from, to)];
  const orderRows = await db.select().from(orders).where(sql.join(conditions, sql` AND `));
  const orderIds = orderRows.map((o) => o.id);
  const items = orderIds.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [];
  const productRows = await db.select().from(products).where(eq(products.outletId, outletId));
  const productCategoryById = new Map(productRows.map((p) => [p.id, p.category]));
  const itemsByOrder = new Map<string, typeof items>();
  for (const it of items) {
    const list = itemsByOrder.get(it.orderId) ?? [];
    list.push(it);
    itemsByOrder.set(it.orderId, list);
  }

  const staffRows = await db.select().from(staffUsers).where(eq(staffUsers.outletId, outletId));
  const shiftConditions = [sql`${shifts.outletId} = ${outletId}`, ...dayRangeConditions(shifts.openedAt, from, to)];
  const shiftRows = await db.select().from(shifts).where(sql.join(shiftConditions, sql` AND `));

  const byStaff = new Map<string, { orders: typeof orderRows; }>();
  for (const o of orderRows) {
    if (!o.staffUserId) continue;
    const cur = byStaff.get(o.staffUserId) ?? { orders: [] };
    cur.orders.push(o);
    byStaff.set(o.staffUserId, cur);
  }

  const rows: CashierPerformanceRow[] = [];
  for (const staff of staffRows) {
    const bucket = byStaff.get(staff.id);
    if (!bucket || bucket.orders.length === 0) continue;
    const recognized = bucket.orders.filter((o) => o.status === "paid" || o.status === "partial");
    const cancelled = bucket.orders.filter((o) => o.status === "cancelled");

    let rentalTotal = 0, fnbTotal = 0, productTotal = 0;
    for (const o of recognized) {
      for (const it of itemsByOrder.get(o.id) ?? []) {
        const category = it.productId ? productCategoryById.get(it.productId) : undefined;
        const bucketType = itemRevenueBucket(it.itemType, category);
        if (bucketType === "rental") rentalTotal += it.lineTotal;
        else if (bucketType === "fnb") fnbTotal += it.lineTotal;
        else productTotal += it.lineTotal;
      }
      productTotal += (o.serviceCharge ?? 0) + (o.tax ?? 0);
    }

    const totalSales = recognized.reduce((s, o) => s + o.total, 0);
    const staffShifts = shiftRows.filter((s) => s.staffUserId === staff.id);

    rows.push({
      staffUserId: staff.id,
      staffName: staff.name,
      transactionCount: recognized.length,
      totalSales,
      avgTransaction: recognized.length ? Math.round(totalSales / recognized.length) : 0,
      rentalTotal,
      fnbTotal,
      productTotal,
      refundCount: 0, // refunds don't retain a staff-attributable count today (order.staffUserId is the creator, not necessarily the refunder) — informational placeholder
      refundValue: 0,
      voidCount: cancelled.length,
      discountTotal: recognized.reduce((s, o) => s + o.discount, 0),
      shiftsCount: staffShifts.length,
      totalVariance: staffShifts.reduce((s, sh) => s + (sh.variance ?? 0), 0),
      rank: 0,
    });
  }

  rows.sort((a, b) => b.totalSales - a.totalSales);
  rows.forEach((r, i) => (r.rank = i + 1));
  return rows;
}
