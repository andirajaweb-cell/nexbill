import { db } from "@/db/client";
import { orders, orderItems, payments, rentalSessions, rentalUnits, products, stockMovements, customers, membershipTiers, recipes } from "@/db/schema";
import { and, eq, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { computeItemCogs } from "@/lib/accounting/postings";
import { computeProfitLoss } from "@/lib/accounting/reports";
import { outletDateYmd } from "@/lib/time/outlet-time";

/*
 * Laporan operasional (Laporan & Analitik). Aturan yang dipakai SAMA dengan Transaction Center dan
 * jurnal penjualan, supaya angka di sini bisa dicocokkan dengan Transaksi dan Accounting:
 *
 *  - Tanggal = Business Date order (COALESCE(business_date, created_at)) — tanggal yang dipakai
 *    postSalesJournal untuk jurnal pendapatannya. Dulu memakai created_at (jam sesi DIMULAI), jadi
 *    sesi yang lewat tengah malam jatuh di hari berbeda dengan Laba Rugi.
 *  - Order yang diakui = "paid" DAN "partial" (sisanya dicatat sebagai piutang, pendapatannya sudah
 *    masuk jurnal). Dulu hanya "paid", jadi penjualan yang belum lunas hilang dari laporan padahal
 *    ada di Laba Rugi.
 *  - Item yang di-void (kitchen_status = cancelled) tidak dihitung — sama dengan tagihan & jurnal.
 *  - from/to sudah dinormalkan ke batas hari WIB oleh route (lib/reports/range.ts).
 */

const businessDate = sql`COALESCE(${orders.businessDate}, ${orders.createdAt})`;
const RECOGNIZED_STATUSES = ["paid", "partial"] as const;

function rangeConditions(column: SQL | unknown, from?: string, to?: string): SQL[] {
  const conditions: SQL[] = [];
  if (from) conditions.push(sql`${column} >= ${from}`);
  if (to) conditions.push(sql`${column} <= ${to}`);
  return conditions;
}

async function recognizedOrders(outletId: string, from?: string, to?: string, extra: SQL[] = []) {
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.outletId, outletId), inArray(orders.status, [...RECOGNIZED_STATUSES]), ...rangeConditions(businessDate, from, to), ...extra));
}

const REVENUE_GROUP_LABEL: Record<string, string> = {
  "41": "Rental PS",
  "42": "F&B",
  "43": "Produk / merchandise",
  "44": "PPOB (fee admin)",
  "45": "Pendapatan member",
  "46": "Pendapatan operasional lain (booking fee, service charge, pembulatan)",
  "48": "Home Rental",
  "49": "Diskon & retur penjualan",
};

/** Sales report: revenue by day, by category (rental vs POS/F&B), by payment method, plus discount/tax/service-charge totals — and the same period's revenue in Accounting for reconciliation. */
export async function computeSalesReport(outletId: string, from?: string, to?: string) {
  const [recognized, pl] = await Promise.all([recognizedOrders(outletId, from, to), computeProfitLoss(outletId, from, to)]);

  const revenueRental = recognized.filter((o) => o.rentalSessionId).reduce((s, o) => s + o.total, 0);
  const revenuePos = recognized.filter((o) => !o.rentalSessionId).reduce((s, o) => s + o.total, 0);
  const totalDiscount = recognized.reduce((s, o) => s + o.discount, 0);
  const totalTax = recognized.reduce((s, o) => s + o.tax, 0);
  const totalServiceCharge = recognized.reduce((s, o) => s + o.serviceCharge, 0);
  const partial = recognized.filter((o) => o.status === "partial");

  const byDayMap = new Map<string, { rental: number; pos: number }>();
  for (const o of recognized) {
    // Kalender WIB atas Business Date — sama dengan tanggal jurnal pendapatannya.
    const day = outletDateYmd(new Date(o.businessDate ?? o.createdAt));
    const cur = byDayMap.get(day) ?? { rental: 0, pos: 0 };
    if (o.rentalSessionId) cur.rental += o.total;
    else cur.pos += o.total;
    byDayMap.set(day, cur);
  }
  const byDay = Array.from(byDayMap.entries())
    .map(([date, v]) => ({ date, rental: v.rental, pos: v.pos, total: v.rental + v.pos }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const orderIds = recognized.map((o) => o.id);
  const paidPayments = orderIds.length ? await db.select().from(payments).where(and(inArray(payments.orderId, orderIds), eq(payments.status, "success"))) : [];
  const byMethodMap = new Map<string, number>();
  for (const p of paidPayments) byMethodMap.set(p.method, (byMethodMap.get(p.method) ?? 0) + p.amount);
  const byPaymentMethod = Array.from(byMethodMap.entries()).map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount);
  const totalPaid = paidPayments.reduce((s, p) => s + p.amount, 0);

  // Accounting side for the same period (Laba Rugi): operating revenue per COA group + other income.
  const groups = new Map<string, number>();
  for (const r of pl.revenue) {
    if (!r.isPostingAllowed || r.code.startsWith("47") || r.code.startsWith("7")) continue;
    const g = r.code.slice(0, 2);
    groups.set(g, (groups.get(g) ?? 0) + r.balance);
  }
  const accountingGroups = [...groups.entries()]
    .filter(([, amount]) => Math.round(amount) !== 0)
    .map(([group, amount]) => ({ group: `${group}xx`, label: REVENUE_GROUP_LABEL[group] ?? `Pendapatan ${group}xx`, amount }))
    .sort((a, b) => a.group.localeCompare(b.group));

  return {
    from,
    to,
    ordersCount: recognized.length,
    partialCount: partial.length,
    receivableFromPartial: partial.reduce((s, o) => s + Math.max(0, o.total - paidPayments.filter((p) => p.orderId === o.id).reduce((x, p) => x + p.amount, 0)), 0),
    revenueRental,
    revenuePos,
    totalRevenue: revenueRental + revenuePos,
    totalPaid,
    totalDiscount,
    totalTax,
    totalServiceCharge,
    byDay,
    byPaymentMethod,
    accounting: {
      operatingRevenue: pl.netRevenue,
      otherIncome: pl.otherIncome,
      groups: accountingGroups,
    },
  };
}

/** Rental report: per-unit revenue/session-count/avg-duration + overall utilization for a period. */
export async function computeRentalReport(outletId: string, from?: string, to?: string) {
  const units = await db.select().from(rentalUnits).where(eq(rentalUnits.outletId, outletId));
  // A session belongs to the day it ENDED (when it was billed), not when it started — same as the
  // order's Business Date. Sessions whose bill was voided/cancelled are excluded.
  const endedExpr = sql`COALESCE(${rentalSessions.endedAt}, ${rentalSessions.startedAt})`;
  const sessionsAll = await db
    .select()
    .from(rentalSessions)
    .where(and(eq(rentalSessions.outletId, outletId), eq(rentalSessions.status, "finished"), ...rangeConditions(endedExpr, from, to)));
  const sessionIds = sessionsAll.map((s) => s.id);
  const cancelledSessionIds = new Set(
    sessionIds.length
      ? (await db.select({ id: orders.rentalSessionId }).from(orders).where(and(inArray(orders.rentalSessionId, sessionIds), eq(orders.status, "cancelled")))).map((o) => o.id)
      : []
  );
  const sessions = sessionsAll.filter((s) => !cancelledSessionIds.has(s.id));

  const unitById = new Map(units.map((u) => [u.id, u]));
  const perUnitMap = new Map<string, { unitName: string; consoleType: string; sessionsCount: number; revenue: number; totalMinutes: number }>();
  const minutesOf = (s: (typeof sessions)[number]) => {
    const start = new Date(s.startedAt).getTime();
    const end = s.endedAt ? new Date(s.endedAt).getTime() : start;
    return Math.max(0, (end - start - s.accumulatedPauseMs) / 60000);
  };

  for (const s of sessions) {
    const unit = unitById.get(s.rentalUnitId);
    const cur = perUnitMap.get(s.rentalUnitId) ?? { unitName: unit?.name ?? "?", consoleType: unit?.consoleType ?? "?", sessionsCount: 0, revenue: 0, totalMinutes: 0 };
    cur.sessionsCount += 1;
    cur.revenue += s.totalAmount ?? 0;
    cur.totalMinutes += minutesOf(s);
    perUnitMap.set(s.rentalUnitId, cur);
  }

  const perUnit = Array.from(perUnitMap.entries())
    .map(([unitId, v]) => ({
      unitId,
      unitName: v.unitName,
      consoleType: v.consoleType,
      sessionsCount: v.sessionsCount,
      revenue: v.revenue,
      totalMinutes: Math.round(v.totalMinutes),
      avgDurationMinutes: v.sessionsCount ? Math.round(v.totalMinutes / v.sessionsCount) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = sessions.reduce((s, sess) => s + (sess.totalAmount ?? 0), 0);
  const totalSessions = sessions.length;
  const totalMinutes = sessions.reduce((s, sess) => s + minutesOf(sess), 0);
  const avgDurationMinutes = totalSessions ? Math.round(totalMinutes / totalSessions) : 0;

  return { from, to, unitCount: units.length, totalSessions, totalRevenue, totalMinutes: Math.round(totalMinutes), avgDurationMinutes, excludedCancelled: cancelledSessionIds.size, perUnit };
}

/**
 * Inventory & HPP report: qty/revenue/COGS/margin per product sold, waste, low stock.
 *
 * HPP per produk memakai harga pokok yang BENAR-BENAR tercatat saat stok keluar untuk order itu
 * (stock_movements.unit_cost — outlet FIFO), dan harga modal saat ini bila tidak ada catatannya
 * (rata-rata tertimbang / order lama / produk resep). Total HPP buku besar untuk periode yang sama
 * ikut dikembalikan supaya selisihnya terlihat, bukan disembunyikan.
 */
export async function computeInventoryReport(outletId: string, from?: string, to?: string) {
  const [paidOrders, pl, outletProducts] = await Promise.all([
    recognizedOrders(outletId, from, to),
    computeProfitLoss(outletId, from, to),
    db.select({ id: products.id, name: products.name }).from(products).where(eq(products.outletId, outletId)),
  ]);
  const orderIds = paidOrders.map((o) => o.id);
  const items = orderIds.length
    ? (await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))).filter((i) => i.kitchenStatus !== "cancelled")
    : [];

  const productIds = [...new Set(items.map((i) => i.productId).filter((id): id is string => Boolean(id)))];
  const [movements, recipeRows] = await Promise.all([
    orderIds.length && productIds.length
      ? db
          .select({ orderId: stockMovements.refOrderId, productId: stockMovements.productId, qty: stockMovements.qty, unitCost: stockMovements.unitCost })
          .from(stockMovements)
          .where(and(inArray(stockMovements.refOrderId, orderIds), eq(stockMovements.type, "sale_out"), isNotNull(stockMovements.unitCost), inArray(stockMovements.productId, productIds)))
      : Promise.resolve([]),
    productIds.length ? db.select({ productId: recipes.productId }).from(recipes).where(inArray(recipes.productId, productIds)) : Promise.resolve([]),
  ]);
  const recorded = new Map<string, { qty: number; cost: number }>();
  for (const m of movements) {
    const key = `${m.orderId}|${m.productId}`;
    const cur = recorded.get(key) ?? { qty: 0, cost: 0 };
    cur.qty += Math.abs(m.qty);
    cur.cost += Math.abs(m.qty) * (m.unitCost ?? 0);
    recorded.set(key, cur);
  }
  const recipeIds = new Set(recipeRows.map((r) => r.productId));
  const currentUnitCost = new Map<string, number>();
  for (const pid of productIds) currentUnitCost.set(pid, await computeItemCogs(pid, 1));

  const productMap = new Map<string, { name: string; qty: number; revenue: number; cogs: number; estimated: boolean }>();
  for (const item of items) {
    if (!item.productId) continue;
    const cur = productMap.get(item.productId) ?? { name: item.description, qty: 0, revenue: 0, cogs: 0, estimated: false };
    cur.qty += item.qty;
    cur.revenue += item.lineTotal;
    const rec = !recipeIds.has(item.productId) ? recorded.get(`${item.orderId}|${item.productId}`) : undefined;
    if (rec && rec.qty > 0) {
      cur.cogs += (rec.cost / rec.qty) * item.qty;
    } else {
      cur.cogs += (currentUnitCost.get(item.productId) ?? 0) * item.qty;
      cur.estimated = true;
    }
    productMap.set(item.productId, cur);
  }

  const perProduct = [...productMap.entries()]
    .map(([productId, v]) => {
      const margin = v.revenue - v.cogs;
      return { productId, name: v.name, qty: v.qty, revenue: v.revenue, cogs: Math.round(v.cogs), margin: Math.round(margin), marginPercent: v.revenue > 0 ? Math.round((margin / v.revenue) * 1000) / 10 : 0, estimated: v.estimated };
    })
    .sort((a, b) => b.revenue - a.revenue);

  const totalRevenue = perProduct.reduce((s, p) => s + p.revenue, 0);
  const totalCogs = perProduct.reduce((s, p) => s + p.cogs, 0);

  // Waste — ONLY this outlet's products (stock_movements has no outlet column; the old query
  // summed every outlet's waste and showed "?" for products it couldn't name).
  const outletProductIds = outletProducts.map((p) => p.id);
  const wasteRows = outletProductIds.length
    ? await db
        .select({ productId: stockMovements.productId, qty: stockMovements.qty })
        .from(stockMovements)
        .where(and(eq(stockMovements.type, "waste"), inArray(stockMovements.productId, outletProductIds), ...rangeConditions(stockMovements.createdAt, from, to)))
    : [];
  const wasteByProduct = new Map<string, number>();
  for (const w of wasteRows) wasteByProduct.set(w.productId, (wasteByProduct.get(w.productId) ?? 0) + Math.abs(w.qty));
  const productNameById = new Map(outletProducts.map((p) => [p.id, p.name]));
  const waste = [...wasteByProduct.entries()].map(([productId, qty]) => ({ productId, name: productNameById.get(productId) ?? "?", qty })).sort((a, b) => b.qty - a.qty);

  const lowStock = await db
    .select({ id: products.id, name: products.name, stockQty: products.stockQty, lowStockThreshold: products.lowStockThreshold })
    .from(products)
    .where(sql`${products.outletId} = ${outletId} AND ${products.stockQty} <= ${products.lowStockThreshold} AND ${products.isActive} = true`);

  return {
    from,
    to,
    totalRevenue,
    totalCogs,
    totalMargin: totalRevenue - totalCogs,
    glCogs: pl.totalCogs,
    anyEstimated: perProduct.some((p) => p.estimated),
    perProduct,
    waste,
    lowStock,
  };
}

/** Customer report: top spenders (all-time totalSpending), visit count within the period, and membership tier distribution. */
export async function computeCustomerReport(outletId: string, from?: string, to?: string) {
  const allCustomers = await db.select().from(customers).where(eq(customers.outletId, outletId));
  const tiers = await db.select().from(membershipTiers).where(eq(membershipTiers.outletId, outletId));
  const tierNameById = new Map(tiers.map((t) => [t.id, t.name]));

  const periodOrders = await recognizedOrders(outletId, from, to, [sql`${orders.customerId} IS NOT NULL`]);

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

  const activeInPeriod = visitsByCustomer.size;
  const spendingInPeriod = [...visitsByCustomer.values()].reduce((s, v) => s + v.spending, 0);

  return { from, to, totalCustomers: allCustomers.length, activeInPeriod, spendingInPeriod, topCustomers, tierDistribution };
}
