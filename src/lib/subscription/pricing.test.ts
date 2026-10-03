import { describe, it, expect } from "vitest";
import {
  computePlanCharge,
  prorateUpgrade,
  resolveEntitlements,
  featureForApiRequest,
  featureForDashboardPath,
  planTierOf,
  describeCharge,
  DEFAULT_PRICING,
} from "./pricing";

const starter = { code: "starter", tier: "starter", pricingModel: "per_unit", priceCurrent: 6000, minUnits: 5, annualMonthsCharged: 10, multiOutletDiscountPct: 20 };
const pro = { code: "pro", tier: "pro", pricingModel: "flat", priceCurrent: 199000, minUnits: 1, annualMonthsCharged: 10, multiOutletDiscountPct: 20 };

describe("computePlanCharge", () => {
  it("Starter bills per unit with a 5-unit minimum", () => {
    expect(computePlanCharge(starter, { units: 3 }).amount).toBe(30000);
    expect(computePlanCharge(starter, { units: 5 }).amount).toBe(30000);
    const c = computePlanCharge(starter, { units: 12 });
    expect(c.billedUnits).toBe(12);
    expect(c.amount).toBe(72000);
  });
  it("Pro is flat per outlet regardless of units", () => {
    expect(computePlanCharge(pro, { units: 40 }).amount).toBe(199000);
    expect(computePlanCharge(pro).billedUnits).toBe(1);
  });
  it("annual = pay 10 months, get 12", () => {
    const c = computePlanCharge(pro, { cycle: "annual" });
    expect(c.amount).toBe(1990000);
    expect(c.monthsGranted).toBe(12);
    expect(c.annualSavings).toBe(398000);
    expect(computePlanCharge(starter, { units: 8, cycle: "annual" }).amount).toBe(480000);
  });
  it("multi-outlet discount applies to additional Pro outlets only", () => {
    expect(computePlanCharge(pro, { additionalOutlet: true }).amount).toBe(159200);
    expect(computePlanCharge(starter, { units: 5, additionalOutlet: true }).amount).toBe(30000);
    expect(computePlanCharge(pro, { additionalOutlet: true, cycle: "annual" }).amount).toBe(1592000);
  });
  it("defaults match the published price list", () => {
    expect(DEFAULT_PRICING.starterPerUnit).toBe(6000);
    expect(DEFAULT_PRICING.proFlat).toBe(199000);
  });
  it("describes a charge readably", () => {
    expect(describeCharge("NEXBILL Starter", computePlanCharge(starter, { units: 8, cycle: "annual" }))).toContain("8 unit");
  });
});

describe("prorateUpgrade", () => {
  const start = "2026-10-01T00:00:00.000Z";
  const end = "2026-10-31T00:00:00.000Z";
  it("charges the remaining fraction of the difference, rounded up to Rp100", () => {
    const now = new Date("2026-10-16T00:00:00.000Z");
    expect(prorateUpgrade({ oldCycleAmount: 30000, newCycleAmount: 199000, periodStart: start, periodEnd: end, now })).toBe(84500);
  });
  it("is zero for downgrades or an ended period", () => {
    expect(prorateUpgrade({ oldCycleAmount: 199000, newCycleAmount: 30000, periodStart: start, periodEnd: end })).toBe(0);
    expect(prorateUpgrade({ oldCycleAmount: 0, newCycleAmount: 1000, periodStart: start, periodEnd: end, now: new Date("2026-11-02") })).toBe(0);
  });
});

describe("resolveEntitlements", () => {
  it("trial gets everything, unlimited units", () => {
    const e = resolveEntitlements({ status: "trial", tier: "starter" });
    expect(e.features).toContain("accounting");
    expect(e.unitLimit).toBeNull();
  });
  it("free_forever stays fully open (unchanged behaviour)", () => {
    const e = resolveEntitlements({ status: "free_forever", tier: null });
    expect(e.features.length).toBeGreaterThan(0);
    expect(e.unitLimit).toBeNull();
  });
  it("starter locks Pro features and caps units at the paid quota (min 5)", () => {
    const e = resolveEntitlements({ status: "active", tier: "starter", planUnits: 3, minUnits: 5 });
    expect(e.features).toEqual([]);
    expect(e.unitLimit).toBe(5);
    expect(resolveEntitlements({ status: "grace", tier: "starter", planUnits: 9 }).unitLimit).toBe(9);
  });
  it("pro and legacy (no plan) are fully open", () => {
    expect(resolveEntitlements({ status: "active", tier: "pro" }).unitLimit).toBeNull();
    expect(resolveEntitlements({ status: "active", tier: null }).features).toContain("ppob");
  });
});

describe("feature routing", () => {
  it("maps API paths to the right feature", () => {
    expect(featureForApiRequest("/api/accounting/journal", "GET")).toBe("accounting");
    expect(featureForApiRequest("/api/accounting/coa", "GET")).toBeNull();
    expect(featureForApiRequest("/api/accounting/coa", "POST")).toBe("accounting");
    expect(featureForApiRequest("/api/expenses", "GET")).toBeNull();
    expect(featureForApiRequest("/api/expenses", "POST")).toBe("accounting");
    expect(featureForApiRequest("/api/expenses/upload", "POST")).toBe("accounting");
    expect(featureForApiRequest("/api/assets/abc", "PATCH")).toBe("assets");
    expect(featureForApiRequest("/api/ppob/transactions", "POST")).toBe("ppob");
    expect(featureForApiRequest("/api/outlets", "POST")).toBe("multi_outlet");
    expect(featureForApiRequest("/api/outlets", "GET")).toBeNull();
    expect(featureForApiRequest("/api/orders", "POST")).toBeNull();
    expect(featureForApiRequest("/api/assetsx", "GET")).toBeNull();
  });
  it("maps dashboard pages", () => {
    expect(featureForDashboardPath("/dashboard/accounting")).toBe("accounting");
    expect(featureForDashboardPath("/dashboard/semua-outlet")).toBe("multi_outlet");
    expect(featureForDashboardPath("/dashboard/pos")).toBeNull();
  });
  it("planTierOf falls back to pro for unknown/legacy plans", () => {
    expect(planTierOf({ code: "standard" })).toBe("pro");
    expect(planTierOf({ code: "starter" })).toBe("starter");
    expect(planTierOf(null)).toBe("pro");
  });
});
