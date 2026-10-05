import { describe, it, expect } from "vitest";
import { filterShifts, summarizeShifts, shiftYears, defaultFilterValue } from "./history-filter";

const rows = [
  // 4 Okt 22.00 WIB = 15.00 UTC
  { id: "a", openedAt: "2026-10-04T15:00:00.000Z", staffUserId: "s1", status: "closed", variance: -5000, nonCashVarianceTotal: 0, riskFlags: "[]" },
  // 5 Okt 01.00 WIB = 4 Okt 18.00 UTC → tanggal WIB 5 Okt
  { id: "b", openedAt: "2026-10-04T18:00:00.000Z", staffUserId: "s2", status: "closed", variance: 2000, nonCashVarianceTotal: 1000, riskFlags: '[{"code":"x"}]' },
  { id: "c", openedAt: "2026-09-10T02:00:00.000Z", staffUserId: "s1", status: "closed", variance: 0, nonCashVarianceTotal: 0, riskFlags: null },
  { id: "d", openedAt: "2025-12-31T10:00:00.000Z", staffUserId: "s1", status: "open", variance: null, nonCashVarianceTotal: null },
];

describe("shift history filter", () => {
  it("hari memakai tanggal WIB", () => {
    expect(filterShifts(rows, { mode: "day", value: "2026-10-04" }).map((r) => r.id)).toEqual(["a"]);
    expect(filterShifts(rows, { mode: "day", value: "2026-10-05" }).map((r) => r.id)).toEqual(["b"]);
  });
  it("bulan & tahun", () => {
    expect(filterShifts(rows, { mode: "month", value: "2026-10" }).map((r) => r.id)).toEqual(["a", "b"]);
    expect(filterShifts(rows, { mode: "year", value: "2026" }).map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(filterShifts(rows, { mode: "all", value: "" })).toHaveLength(4);
  });
  it("karyawan & status", () => {
    expect(filterShifts(rows, { mode: "all", value: "", staffUserId: "s1" }).map((r) => r.id)).toEqual(["a", "c", "d"]);
    expect(filterShifts(rows, { mode: "all", value: "", status: "flagged" }).map((r) => r.id)).toEqual(["b"]);
    expect(filterShifts(rows, { mode: "all", value: "", status: "variance" }).map((r) => r.id)).toEqual(["a", "b"]);
    expect(filterShifts(rows, { mode: "all", value: "", status: "open" }).map((r) => r.id)).toEqual(["d"]);
  });
  it("ringkasan & tahun", () => {
    const s = summarizeShifts(rows);
    expect(s).toMatchObject({ count: 4, closedCount: 3, openCount: 1, cashVariance: -3000, shortage: -5000, nonCashVariance: 1000, flaggedCount: 1 });
    expect(shiftYears(rows, new Date("2026-10-05T00:00:00Z"))).toEqual(["2026", "2025"]);
    expect(defaultFilterValue("month", new Date("2026-10-04T18:00:00Z"))).toBe("2026-10");
  });
});
