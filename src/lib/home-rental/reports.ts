import { db } from "@/db/client";
import {
  homeRentalRentals,
  homeRentalRentalAssets,
  homeRentalAssets,
  homeRentalProducts,
  homeRentalPackages,
  homeRentalCustomerRisk,
} from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

export interface HomeRentalReportParams {
  outletId: string;
  from: string; // ISO date/datetime, inclusive
  to: string; // ISO date/datetime, inclusive
}

/** Full Home Rental report bundle for a period — one call, one round-trip, mirrors the "combined report object" pattern used by the other report modules in this app. */
export async function getHomeRentalReports({ outletId, from, to }: HomeRentalReportParams) {
  const rentals = await db
    .select()
    .from(homeRentalRentals)
    .where(and(eq(homeRentalRentals.outletId, outletId), gte(homeRentalRentals.createdAt, from), lte(homeRentalRentals.createdAt, to)));

  const products = await db.select().from(homeRentalProducts).where(eq(homeRentalProducts.outletId, outletId));
  const productById = new Map(products.map((p) => [p.id, p]));
  const packages = await db.select().from(homeRentalPackages).where(eq(homeRentalPackages.outletId, outletId));
  const packageById = new Map(packages.map((p) => [p.id, p]));
  const assets = await db.select().from(homeRentalAssets).where(eq(homeRentalAssets.outletId, outletId));

  // --- 1. Revenue summary ---
  const returnedOrActive = rentals.filter((r) => r.status === "active" || r.status === "returned");
  const revenue = {
    rentalFee: sum(returnedOrActive.map((r) => r.rentalFee)),
    deliveryFee: sum(returnedOrActive.map((r) => r.deliveryFee)),
    pickupFee: sum(returnedOrActive.map((r) => r.pickupFee)),
    lateFee: sum(returnedOrActive.map((r) => r.lateFee)),
    damageFee: sum(returnedOrActive.map((r) => r.damageFee)),
    discountAmount: sum(returnedOrActive.map((r) => r.discountAmount)),
    totalAmount: sum(returnedOrActive.map((r) => r.totalAmount)),
    paidAmount: sum(returnedOrActive.map((r) => r.paidAmount)),
    transactionCount: returnedOrActive.length,
  };

  // --- 2. Active/overdue list ---
  const now = new Date().toISOString();
  const active = rentals.filter((r) => r.status === "active");
  const activeList = active
    .map((r) => ({
      id: r.id,
      rentalCode: r.rentalCode,
      customerName: r.customerName,
      phone: r.phone,
      scheduledEnd: r.scheduledEnd,
      isOverdue: r.scheduledEnd < now,
      daysOverdue: r.scheduledEnd < now ? Math.max(1, Math.ceil((Date.now() - new Date(r.scheduledEnd).getTime()) / 86400000)) : 0,
      depositAmount: r.depositAmount,
      depositStatus: r.depositStatus,
    }))
    .sort((a, b) => (b.daysOverdue as number) - (a.daysOverdue as number));

  // --- 3. Asset utilization ---
  const rentalIdsInPeriod = rentals.map((r) => r.id);
  const links = rentalIdsInPeriod.length
    ? await db.select().from(homeRentalRentalAssets).where(inArray(homeRentalRentalAssets.rentalId, rentalIdsInPeriod))
    : [];
  const daysOutByAsset = new Map<string, number>();
  const rentalById = new Map(rentals.map((r) => [r.id, r]));
  for (const l of links) {
    const rental = rentalById.get(l.rentalId);
    if (!rental) continue;
    const outAt = l.scannedOutAt ?? rental.pickedUpAt;
    const inAt = l.scannedInAt ?? rental.returnedAt ?? now;
    if (!outAt) continue;
    const days = Math.max(0, (new Date(inAt).getTime() - new Date(outAt).getTime()) / 86400000);
    daysOutByAsset.set(l.assetId, (daysOutByAsset.get(l.assetId) ?? 0) + days);
  }
  const periodDays = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / 86400000);
  const assetUtilization = assets
    .filter((a) => a.isActive)
    .map((a) => ({
      assetId: a.id,
      assetCode: a.assetCode,
      productName: productById.get(a.productId)?.name ?? "-",
      status: a.status,
      daysRentedInPeriod: Math.round((daysOutByAsset.get(a.id) ?? 0) * 10) / 10,
      utilizationRate: Math.min(1, (daysOutByAsset.get(a.id) ?? 0) / periodDays),
    }))
    .sort((a, b) => b.utilizationRate - a.utilizationRate);

  // --- 4. Rental by product type ---
  const byTypeMap = new Map<string, { type: string; count: number; revenue: number }>();
  for (const r of returnedOrActive) {
    const type = r.packageId ? "package" : productById.get(r.productId ?? "")?.type ?? "lainnya";
    const cur = byTypeMap.get(type) ?? { type, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += r.totalAmount;
    byTypeMap.set(type, cur);
  }
  const byProductType = [...byTypeMap.values()].sort((a, b) => b.revenue - a.revenue);

  // --- 5. Package performance ---
  const byPackageMap = new Map<string, { packageId: string; packageName: string; count: number; revenue: number }>();
  for (const r of returnedOrActive) {
    if (!r.packageId) continue;
    const key = r.packageId;
    const cur = byPackageMap.get(key) ?? { packageId: key, packageName: packageById.get(key)?.name ?? "-", count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += r.totalAmount;
    byPackageMap.set(key, cur);
  }
  const packagePerformance = [...byPackageMap.values()].sort((a, b) => b.revenue - a.revenue);

  // --- 6. Customer rental history (with risk level) ---
  const phones = [...new Set(rentals.map((r) => r.phone).filter((p): p is string => !!p))];
  const riskRows = phones.length
    ? await db.select().from(homeRentalCustomerRisk).where(and(eq(homeRentalCustomerRisk.outletId, outletId), inArray(homeRentalCustomerRisk.phone, phones)))
    : [];
  const riskByPhone = new Map(riskRows.map((r) => [r.phone, r]));
  const byCustomerMap = new Map<string, { phone: string; customerName: string | null; rentalCount: number; totalSpend: number; riskLevel: string; isBlacklisted: boolean }>();
  for (const r of rentals) {
    if (!r.phone) continue;
    const cur = byCustomerMap.get(r.phone) ?? {
      phone: r.phone,
      customerName: r.customerName,
      rentalCount: 0,
      totalSpend: 0,
      riskLevel: riskByPhone.get(r.phone)?.riskLevel ?? "low",
      isBlacklisted: riskByPhone.get(r.phone)?.isBlacklisted ?? false,
    };
    cur.rentalCount += 1;
    cur.totalSpend += r.paidAmount;
    byCustomerMap.set(r.phone, cur);
  }
  const customerHistory = [...byCustomerMap.values()].sort((a, b) => b.totalSpend - a.totalSpend);

  // --- 7. Deposit report ---
  const depositRentals = rentals.filter((r) => r.depositAmount > 0);
  const depositReport = {
    held: sum(depositRentals.filter((r) => r.depositStatus === "held").map((r) => r.depositAmount)),
    released: sum(depositRentals.filter((r) => r.depositStatus === "released").map((r) => r.depositAmount)),
    partiallyDeducted: sum(depositRentals.filter((r) => r.depositStatus === "partially_deducted").map((r) => r.depositAmount)),
    forfeited: sum(depositRentals.filter((r) => r.depositStatus === "forfeited").map((r) => r.depositAmount)),
    count: depositRentals.length,
  };

  // --- 8. Late fee revenue ---
  const lateFeeRentals = rentals.filter((r) => r.lateFee > 0);
  const lateFeeReport = { total: sum(lateFeeRentals.map((r) => r.lateFee)), count: lateFeeRentals.length };

  // --- 8b. Damage/replacement revenue (penggantian kerusakan) ---
  const damageRentals = rentals.filter((r) => r.damageFee > 0);
  const damageReport = { total: sum(damageRentals.map((r) => r.damageFee)), count: damageRentals.length };

  // --- 9. Cancellation / no-show rate ---
  const totalBookings = rentals.length;
  const cancelledCount = rentals.filter((r) => r.status === "cancelled").length;
  const noShowCount = rentals.filter((r) => r.status === "no_show").length;
  const cancellationReport = {
    totalBookings,
    cancelledCount,
    noShowCount,
    cancellationRate: totalBookings > 0 ? cancelledCount / totalBookings : 0,
    noShowRate: totalBookings > 0 ? noShowCount / totalBookings : 0,
  };

  return {
    period: { from, to },
    revenue,
    activeList,
    assetUtilization,
    byProductType,
    packagePerformance,
    customerHistory,
    depositReport,
    lateFeeReport,
    damageReport,
    cancellationReport,
  };
}

function sum(nums: number[]): number {
  return Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100;
}
