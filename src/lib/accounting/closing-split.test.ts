import { describe, it, expect } from "vitest";
import { monthStartIso, monthEndIso, nextPeriod, resolveClosedThrough, splitRetainedEarnings } from "./closing-split";

describe("closing-split", () => {
  it("batas bulan UTC", () => {
    expect(monthStartIso("2026-09")).toBe("2026-09-01T00:00:00.000Z");
    expect(monthEndIso("2026-09")).toBe("2026-09-30T23:59:59.999Z");
    expect(monthEndIso("2024-02")).toBe("2024-02-29T23:59:59.999Z");
    expect(nextPeriod("2026-12")).toBe("2027-01");
    expect(nextPeriod("2026-09")).toBe("2026-10");
  });

  it("belum ada periode tertutup", () => {
    const r = resolveClosedThrough([], "2026-10-04T10:00:00.000Z");
    expect(r.closedThrough).toBeNull();
    expect(r.closedEnd).toBeNull();
    expect(r.asOfPeriodClosed).toBe(false);
  });

  it("September ditutup, laporan per 4 Oktober", () => {
    const r = resolveClosedThrough(["2026-09"], "2026-10-04T16:59:59.999Z");
    expect(r.closedThrough).toBe("2026-09");
    expect(r.closedEnd).toBe("2026-09-30T23:59:59.999Z");
    expect(r.currentFrom).toBe("2026-10-01T00:00:00.000Z");
    expect(r.asOfPeriodClosed).toBe(false);
  });

  it("laporan jatuh di dalam bulan tertutup → dipotong ke tanggal laporan", () => {
    const r = resolveClosedThrough(["2026-08", "2026-09"], "2026-09-15T16:59:59.999Z");
    expect(r.closedThrough).toBe("2026-09");
    expect(r.closedEnd).toBe("2026-09-15T16:59:59.999Z");
    expect(r.asOfPeriodClosed).toBe(true);
  });

  it("periode tertutup setelah tanggal laporan diabaikan", () => {
    const r = resolveClosedThrough(["2026-09"], "2026-08-20T00:00:00.000Z");
    expect(r.closedThrough).toBeNull();
  });

  it("mendeteksi bulan terbuka yang terlewat", () => {
    const r = resolveClosedThrough(["2026-07", "2026-09"], "2026-10-04T00:00:00.000Z", "2026-06");
    expect(r.openGaps).toEqual(["2026-06", "2026-08"]);
    const r2 = resolveClosedThrough(["2025-12", "2026-01"], "2026-02-01T00:00:00.000Z", "2025-12");
    expect(r2.openGaps).toEqual([]);
  });

  it("total laba tetap sama setelah dipecah", () => {
    const s = splitRetainedEarnings(2_084_191, 1_500_000);
    expect(s.retainedEarningsClosed + s.currentPeriodNetProfit).toBe(2_084_191);
    expect(splitRetainedEarnings(1000, null)).toEqual({ retainedEarningsClosed: 0, currentPeriodNetProfit: 1000 });
  });
});

describe("label", () => {
  it("format periode & label baris", async () => {
    const { formatPeriodLabel, formatPeriodStart, balanceSheetProfitLabels } = await import("./closing-split");
    expect(formatPeriodLabel("2026-09", "id")).toBe("September 2026");
    expect(formatPeriodStart("2026-10", "id")).toBe("1 Oktober 2026");
    const t = (_k: string, f: string) => f;
    const l = balanceSheetProfitLabels({ closedThroughPeriod: "2026-09", asOfPeriodClosed: false }, "id", t);
    expect(l.retained).toBe("Laba Ditahan (periode tertutup s/d September 2026)");
    expect(l.current).toBe("Laba Periode Berjalan (belum ditutup, sejak 1 Oktober 2026)");
    expect(balanceSheetProfitLabels({ closedThroughPeriod: null, asOfPeriodClosed: false }, "id", t).retained).toBeNull();
  });
});
