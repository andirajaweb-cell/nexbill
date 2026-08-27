import { db } from "@/db/client";
import { orders, orderItems, payments, rentalSessions, rentalUnits, products, stockMovements, customers, membershipTiers } from "@/db/schema";
import { sql, inArray } from "drizzle-orm";
import { computeItemCogs } from "@/lib/accounting/postings";

function dayRangeConditions(column: any, from?: string, to?: string) {
  const conditions = [];
  if (from) conditions.push(sql`${column} >= ${from}`);
  if (to) conditions.push(sql`${column} <= ${to}`);
  return conditions;
}

/** Sales report: revenue by day, by category (rental vs POS/F&B), by payment method, plus discount/tax/service-charge totals. */
export async function computeSalesReport(outletId: string, from?: string, to?: string) {
  const conditions = [sql`${orders.outletId} = ${outletId}`, sql`${orders.status} = 'paid'`, ...dayRangeConditions(orders.createdAt, from, to)];
  const paidOrders = await db.select().from(orders).where(sql.join(conditions, sql` AND `));

  const revenueRental = paidOrders.filter((o) => o.rentalSessionId).reduce((s, o) => s + o.total, 0);
  const revenuePos = paidOrders.filter((o) => !o.rentalSessionId).reduce((s, o) => s + o.total, 0);
  const totalDiscount = paidOrders.reduce((s, o) => s + o.discount, 0);
  const totalTax = paidOrders.reduce((s, o) => s + o.tax, 0);
  const totalServiceCharge = paidOrders.reduce((s, o) => s + o.serviceCharge, 0);

  const byDayMap = new Map<string, { rental: number; pos: number }>();
  for (const o of paidOrders) {
    const day = o.createdAt.slice(0, 10);
    const cur = byDayMap.get(day) ?? { rental: 0, pos: 0 };
    if (o.rentalSessionId) cur.rental += o.total; else cur.pos += o.total;
    byDayMap.set(day, cur);
  }
  const byDay = Array.from(byDayMap.entries()).map(([date, v]) => ({ date, rental: v.rental, pos: v.pos, total: v.rental + v.pos })).sort((a, b) => a.date.localeCompare(b.date));

  const orderIds = paidOrders.map((o) => o.id);
  const paidPayments = orderIds.length
    ? await db.select().from(payments).where(sql`${payments.orderId} IN ${orderIds} AND ${payments.status} = 'success'`)
    : [];
  const byMethodMap = new Map<string, number>();
  for (const p of paidPayments) byMethodMap.set(p.method, (byMethodMap.get(p.method) ?? 0) + p.amount);
  const byPaymentMethod = Array.from(byMethodMap.entries()).map(([method, amount]) => ({ method, amount }));

  return {
    from, to,
    ordersCount: paidOrders.length,
    revenueRental,
    revenuePos,
    totalRevenue: revenueRental + revenuePos,
    totalDiscount,
    totalTax,
    totalServiceCharge,
    byDay,
    byPaymentMethod,
  };
}

/** Rental report: per-unit revenue/session-count/avg-duration + overall utilization for a period. */
export async function computeRentalReport(outletId: string, from?: string, to?: string) {
  const units = await db.select().from(rentalUnits).where(sql`${rentalUnits.outletId} = ${outletId}`);
  const conditions = [sql`${rentalSessions.outletId} = ${outletId}`, sql`${rentalSessions.status} = 'finished'`, ...dayRangeConditions(rentalSessions.startedAt, from, to)];
  const sessions = await db.select().from(rentalSessions).where(sql.join(conditions, sql` AND `));

  const unitById = new Map(units.map((u) => [u.id, u]));
  const perUnitMap = new Map<string, { unitName: string; consoleType: string; sessionsCount: number; revenue: number; totalMinutes: number }>();

  for (const s of sessions) {
    const unit = unitById.get(s.rentalUnitId);
    const key = s.rentalUnitId;
    const cur = perUnitMap.get(key) ?? { unitName: unit?.name ?? "?", consoleType: unit?.consoleType ?? "?", sessionsCount: 0, revenue: 0, totalMinutes: 0 };
    cur.sessionsCount += 1;
    cur.revenue += s.totalAmount ?? 0;
    const start = new Date(s.startedAt).getTime();
    const end = s.endedAt ? new Date(s.endedAt).getTime() : start;
    cur.totalMinutes += Math.max(0, (end - start - s.accumulatedPauseMs) / 60000);
    perUnitMap.set(key, cur);
  }

  const perUnit = Array.from(perUnitMap.entries())
    .map(([unitId, v]) => ({
      unitId,
      unitName: v.unitName,
      consoleType: v.consoleType,
      sessionsCount: v.sessionsCount,
      revenue: v.revenue,
      avgDurationMinutes: v.sessionsCount ? Math.round(v.totalMinutes / v.sessionsCount) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = sessions.reduce((s, sess) => s + (sess.totalAmount ?? 0), 0);
  const totalSessions = sessions.length;
  const avgDurationMinutes = totalSessions ? Math.round(sessions.reduce((s, sess) => {
    const start = new Date(sess.startedAt).getTime();
    const end = sess.endedAt ? new Date(sess.endedAt).getTime() : start;
    return s + Math.max(0, (end - start - sess.accumulatedPauseMs) / 60000);
  }, 0) / totalSessions) : 0;

  return { from, to, unitCount: units.length, totalSessions, totalRevenue, avgDurationMinutes, perUnit };
}

/** Inventory & HPP report: qty/revenue/COGS/margin per product sold, plus waste stock movements, in a period. */
export async function computeInventoryReport(outletId: string, from?: string, to?: string) {
  const orderConditions = [sql`${orders.outletId} = ${outletId}`, sql`${orders.status} = 'paid'`, ...dayRangeConditions(orders.createdAt, from, to)];
  const paidOrders = await db.select({ id: orders.id }).from(orders).where(sql.join(orderConditions, sql` AND `));
  const orderIds = paidOrders.map((o) => o.id);

  const items = orderIds.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)) : [];

  const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const item of items) {
    if (!item.productId) continue;
    const cur = productMap.get(item.productId) ?? { name: item.description, qty: 0, revenue: 0 };
    cur.qty += item.qty;
    cur.revenue += item.lineTotal;
    productMap.set(item.productId, cur);
  }

  const perProduct = [];
  for (const [productId, v] of productMap.entries()) {
    const cogs = await computeItemCogs(productId, v.qty);
    const margin = v.revenue - cogs;
    const marginPercent = v.revenue > 0 ? Math.round((margin / v.revenue) * 1000) / 10 : 0;
    perProduct.push({ productId, name: v.name, qty: v.qty, revenue: v.revenue, cogs: Math.round(cogs), margin: Math.round(margin), marginPercent });
  }
  perProduct.sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = perProduct.reduce((s, p) => s + p.revenue, 0);
  const totalCogs = perProduct.reduce((s, p) => s + p.cogs, 0);

  const wasteConditions = [sql`${stockMovements.type} = 'waste'`, ...dayRangeConditions(stockMovements.createdAt, from, to)];
  const wasteRows = await db.select().from(stockMovements).where(sql.join(wasteConditions, sql` AND `));
  const wasteByProduct = new Map<string, number>();
  for (const w of wasteRows) wasteByProduct.set(w.productId, (wasteByProduct.get(w.productId) ?? 0) + Math.abs(w.qty));
  const allProducts = await db.select({ id: products.id, name: products.name }).from(products).where(sql`${products.outletId} = ${outletId}`);
  const productNameById = new Map(allProducts.map((p) => [p.id, p.name]));
  const waste = Array.from(wasteByProduct.entries()).map(([productId, qty]) => ({ productId, name: productNameById.get(productId) ?? "?", qty }));

  const lowStock = await db.select({ id: products.id, name: products.name, stockQty: products.stockQty, lowStockThreshold: products.lowStockThreshold })
    .from(products).where(sql`${products.outletId} = ${outletId} AND ${products.stockQty} <= ${products.lowStockThreshold} AND ${products.isActive} = true`);

  return { from, to, totalRevenue, totalCogs, totalMargin: totalRevenue - totalCogs, perProduct, waste, lowStock };
}

/** Customer report: top spenders (all-time totalSpending), visit count within the period, and membership tier distribution. */
export async function computeCustomerReport(outletId: string, from?: string, to?: string) {
  const allCustomers = await db.select().from(customers).where(sql`${customers.outletId} = ${outletId}`);
  const tiers = await db.select().from(membershipTiers).where(sql`${membershipTiers.outletId} = ${outletId}`);
  const tierNameById = new Map(tiers.map((t) => [t.id, t.name]));

  const orderConditions = [sql`${orders.outletId} = ${outletId}`, sql`${orders.status} = 'paid'`, sql`${orders.customerId} IS NOT NULL`, ...dayRangeConditions(orders.createdAt, from, to)];
  const periodOrders = await db.select().from(orders).where(sql.join(orderConditions, sql` AND `));

  const visitsByCustomer = new Map<string, { visits: number; spending: number }>();
  for (const o of periodOrders) {
    if (!o.customerId) continue;
    const cur = visitsByCustomer.get(o.customerId) ?? { visits: 0, spending: 0 };
    cur.visits += 1;
    cur.spending += o.total;
    visitsByCustomer.set(o.customerId, cur);
  }

  const topCustomers = allCustomers
    .map((c) => ({
      customerId: c.id,
      name: c.name ?? c.phone ?? "-",
      tierName: c.membershipTierId ? tierNameById.get(c.membershipTierId) ?? "-" : "-",
      totalSpendingAllTime: c.totalSpending,
      loyaltyPoints: c.loyaltyPoints,
      visitsInPeriod: visitsByCustomer.get(c.id)?.visits ?? 0,
      spendingInPeriod: visitsByCustomer.get(c.id)?.spending ?? 0,
    }))
    .sort((a, b) => b.totalSpendingAllTime - a.totalSpendingAllTime)
    .slice(0, 20);

  const tierDistributionMap = new Map<string, number>();
  for (const c of allCustomers) {
    const key = c.membershipTierId ? tierNameById.get(c.membershipTierId) ?? "Lainnya" : "Belum Ada Tier";
    tierDistributionMap.set(key, (tierDistributionMap.get(key) ?? 0) + 1);
  }
  const tierDistribution = Array.from(tierDistributionMap.entries()).map(([tierName, count]) => ({ tierName, count }));

  return { from, to, totalCustomers: allCustomers.length, topCustomers, tierDistribution };
}
