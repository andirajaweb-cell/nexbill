import { describe, expect, it } from "vitest";
import { addDaysYmd, fillSeries, forecastSeries, linearSlope, pctChange, revenueAnomalies, trendDirection, weekdayIndex, weekdayOf } from "./insights-rules";

describe("AI Insights — perhitungan", () => {
  it("tanggal & deret", () => {
    expect(addDaysYmd("2026-10-31", 1)).toBe("2026-11-01");
    expect(weekdayOf("2026-11-01")).toBe(0); // Minggu
    const s = fillSeries(new Map([["2026-11-01", 100]]), "2026-11-02", 3);
    expect(s).toEqual([
      { date: "2026-10-31", amount: 0 },
      { date: "2026-11-01", amount: 100 },
      { date: "2026-11-02", amount: 0 },
    ]);
  });

  it("tren dengan ambang", () => {
    expect(linearSlope([1, 2, 3]).slope).toBeCloseTo(1);
    expect(trendDirection([100, 100, 101, 100, 100])).toBe("flat");
    expect(trendDirection([100, 120, 140, 160])).toBe("up");
    expect(trendDirection([160, 140, 120, 100])).toBe("down");
    expect(trendDirection([0, 0, 0])).toBe("flat");
  });

  it("forecast mengikuti pola mingguan", () => {
    // 4 minggu: Sabtu (6) 300, hari lain 100.
    const start = "2026-10-04"; // Minggu
    const series = Array.from({ length: 28 }, (_, i) => {
      const date = addDaysYmd(start, i);
      return { date, amount: weekdayOf(date) === 6 ? 300 : 100 };
    });
    const idx = weekdayIndex(series);
    expect(idx[6]).toBeGreaterThan(2);
    const f = forecastSeries(series, 7);
    expect(f).toHaveLength(7);
    const sat = f.find((d) => weekdayOf(d.date) === 6)!;
    const mon = f.find((d) => weekdayOf(d.date) === 1)!;
    expect(sat.amount).toBeGreaterThan(mon.amount * 2);
    expect(f.every((d) => d.amount >= 0)).toBe(true);
  });

  it("anomali per hari dalam seminggu — Sabtu ramai bukan anomali", () => {
    const start = "2026-09-06";
    const series = Array.from({ length: 56 }, (_, i) => {
      const date = addDaysYmd(start, i);
      const base = weekdayOf(date) === 6 ? 300 : 100;
      return { date, amount: base + (i % 3) };
    });
    expect(revenueAnomalies(series)).toEqual([]);
    series[20] = { ...series[20], amount: 2000 };
    const a = revenueAnomalies(series);
    expect(a.map((x) => x.date)).toContain(series[20].date);
  });

  it("persen perubahan", () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(5, 0)).toBeNull();
  });
});
