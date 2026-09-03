import { db } from "@/db/client";
import {
  orders, orderItems, payments, customers, staffUsers, shifts,
  rentalSessions, rentalUnits, products, membershipTiers,
} from "@/db/schema";
import { sql, inArray, eq } from "drizzle-orm";

function dayRangeConditions(column: any, from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(sql`${column} >= ${from}`);
  if (to) conditions.push(sql`${column} <= ${to}`);
  return conditions;
}

/** Same classification the accounting engine uses (see revenueAccountForItem in postings.ts) so
 * Transaction Center figures always agree with the books: rental items -> 4000, food/drink/snack -> 4100,
 * everything else (device rental, accessories, misc) -> 4200 "Lain-lain". */
function itemRevenueBucket(description: string, category?: string): "rental" | "fnb" | "product" {
  if (description.toLowerCase().startsWith("rental:")) return "rental";
  if (category === "food" || category === "drink" || category === "snack") return "fnb";
  return "product";
}

/** Order-level type badge for the Transaction Center table/filter: an order that touches a rental
 * session is shown as "Rental" (even if F&B was added to the same bill — that's the whole point of
 * unified billing), a standalone food/drink/snack sale is "F&B", anything else is "Produk". PPOB has
 * no data source yet (separate module, not built) so it always returns zero rows for that type. */
function classifyOrder(order: { rentalSessionId: string | null }, items: { productId: string | null; description: string; category?: string }[]): "rental" | "fnb" | "product" | "ppob" {
  if (order.rentalSessionId) return "rental";
  if (items.some((i) => itemRevenueBucket(i.description, i.category) === "fnb")) return "fnb";
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

  // Summary is computed over the (pre-type-filter) period set for revenue-by-type breakdown to stay
  // meaningful even when the user has a type filter active — but respects every other filter.
  const summarySet = transactions;
  const recognized = summarySet.filter((t) => t.status === "paid" || t.status === "partial");
  const cancelled = summarySet.filter((t) => t.status === "cancelled");

  // Revenue-by-type mirrors postings.ts exactly: per line item by rental:/category, plus service
  // charge + tax landing in the "product/lain-lain" bucket (same simplification as the accounting engine).
  const revenueByType = { rental: 0, fnb: 0, product: 0, ppob: 0 };
  for (const t of recognized) {
    for (const it of itemsByOrder.get(t.id) ?? []) {
      const category = it.productId ? productCategoryById.get(it.productId) : undefined;
      const bucket = itemRevenueBucket(it.description, category);
      revenueByType[bucket] += it.lineTotal;
    }
    revenueByType.product += (t.serviceCharge ?? 0) + (t.tax ?? 0);
  }

  const byPaymentMethodMap = new Map<string, number>();
  for (const t of recognized) {
    for (const p of t.payments) {
      if (p.status !== "success") continue;
      byPaymentMethodMap.set(p.methodGroup, (byPaymentMethodMap.get(p.methodGroup) ?? 0) + p.amount);
    }
  }

  const refundedAmount = summarySet.reduce((sum, t) => sum + t.payments.filter((p) => p.status === "refunded").reduce((s, p) => s + p.amount, 0), 0);

  const totalRevenue = recognized.reduce((s, t) => s + t.total, 0);
  const totalDiscount = recognized.reduce((s, t) => s + t.discount, 0);
  const totalTax = recognized.reduce((s, t) => s + t.tax, 0);

  const summary = {
    totalTransactions: summarySet.length,
    paidTransactions: recognized.length,
    cancelledTransactions: cancelled.length,
    totalRevenue,
    rentalRevenue: revenueByType.rental,
    fnbRevenue: revenueByType.fnb,
    ppobRevenue: revenueByType.ppob,
    productRevenue: revenueByType.product,
    discount: totalDiscount,
    tax: totalTax,
    refund: refundedAmount,
    netSales: totalRevenue - refundedAmount,
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
        const bucketType = itemRevenueBucket(it.description, category);
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
