import { describe, it, expect } from "vitest";
import { computeLeakage, DEFAULT_LEAKAGE_INPUT, leakageFromParams, leakageMultiple, leakageToParams, sanitizeLeakageInput, starterMonthlyCost } from "./calc";

describe("kalkulator kebocoran", () => {
  it("menghitung tiap sumber kebocoran per bulan", () => {
    const r = computeLeakage(DEFAULT_LEAKAGE_INPUT);
    // 20.000 × 2 shift × 30 hari
    expect(r.cashPerMonth).toBe(1_200_000);
    // 10 unit × 4 sesi × 5 menit × 30 hari = 6.000 menit = 100 jam × 8.000
    expect(r.unbilledMinutesPerMonth).toBe(6000);
    expect(r.unbilledPerMonth).toBe(800_000);
    // 10 TV × 3 jam × 120 W × 30 hari = 108 kWh × 1.444,70
    expect(r.kwhPerMonth).toBe(108);
    expect(r.powerPerMonth).toBe(156_028);
    expect(r.totalPerMonth).toBe(2_156_028);
    expect(r.totalPerYear).toBe(25_872_331);
  });

  it("isian dibatasi ke rentang wajar", () => {
    const i = sanitizeLeakageInput({ units: "-3", idleHoursPerDay: 99, ratePerHour: "abc", shiftsPerDay: "" });
    expect(i.units).toBe(0);
    expect(i.idleHoursPerDay).toBe(24);
    expect(i.ratePerHour).toBe(DEFAULT_LEAKAGE_INPUT.ratePerHour);
    expect(i.shiftsPerDay).toBe(DEFAULT_LEAKAGE_INPUT.shiftsPerDay);
  });

  it("biaya Starter memakai minimal unit & perbandingan kelipatan", () => {
    expect(starterMonthlyCost(3, 6000, 5)).toBe(30_000);
    expect(starterMonthlyCost(10, 6000, 5)).toBe(60_000);
    expect(leakageMultiple(2_156_028, 60_000)).toBe(35.9);
    expect(leakageMultiple(100, 0)).toBeNull();
  });

  it("link berbagi menyimpan semua isian", () => {
    const i = { ...DEFAULT_LEAKAGE_INPUT, units: 14, ratePerHour: 10000 };
    expect(leakageFromParams(leakageToParams(i))).toEqual(i);
  });
});
