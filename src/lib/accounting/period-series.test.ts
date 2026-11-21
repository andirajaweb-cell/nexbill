import { describe, expect, it } from "vitest";
import { buildPeriodBuckets, countPeriodBuckets, defaultSeriesRange, ymdRangeToIso } from "./period-series";

describe("buildPeriodBuckets", () => {
  it("harian: satu kolom per tanggal", () => {
    const b = buildPeriodBuckets("day", "2026-11-01", "2026-11-03");
    expect(b.map((x) => [x.fromYmd, x.toYmd])).toEqual([
      ["2026-11-01", "2026-11-01"],
      ["2026-11-02", "2026-11-02"],
      ["2026-11-03", "2026-11-03"],
    ]);
    expect(b.every((x) => !x.partial)).toBe(true);
  });

  it("mingguan: Senin–Minggu, ujung rentang dipotong & ditandai sebagian", () => {
    // 1 Nov 2026 = Minggu; 2 Nov = Senin
    const b = buildPeriodBuckets("week", "2026-11-01", "2026-11-12");
    expect(b.map((x) => [x.fromYmd, x.toYmd, x.partial])).toEqual([
      ["2026-11-01", "2026-11-01", true],
      ["2026-11-02", "2026-11-08", false],
      ["2026-11-09", "2026-11-12", true],
    ]);
  });

  it("bulanan: termasuk Februari kabisat dan bulan berjalan yang belum selesai", () => {
    const b = buildPeriodBuckets("month", "2028-01-15", "2028-03-10");
    expect(b.map((x) => [x.key, x.fromYmd, x.toYmd, x.partial])).toEqual([
      ["2028-01", "2028-01-15", "2028-01-31", true],
      ["2028-02", "2028-02-01", "2028-02-29", false],
      ["2028-03", "2028-03-01", "2028-03-10", true],
    ]);
  });

  it("kuartalan & tahunan", () => {
    expect(buildPeriodBuckets("quarter", "2026-01-01", "2026-12-31").map((x) => x.key)).toEqual(["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"]);
    expect(buildPeriodBuckets("quarter", "2026-02-10", "2026-04-01").map((x) => [x.fromYmd, x.toYmd])).toEqual([
      ["2026-02-10", "2026-03-31"],
      ["2026-04-01", "2026-04-01"],
    ]);
    expect(buildPeriodBuckets("year", "2024-06-01", "2026-11-21").map((x) => [x.key, x.fromYmd, x.toYmd])).toEqual([
      ["2024", "2024-06-01", "2024-12-31"],
      ["2025", "2025-01-01", "2025-12-31"],
      ["2026", "2026-01-01", "2026-11-21"],
    ]);
  });

  it("kolom-kolom menutup rentang tanpa celah & tanpa tumpang tindih", () => {
    const b = buildPeriodBuckets("week", "2026-01-01", "2026-05-31");
    expect(b[0].fromYmd).toBe("2026-01-01");
    expect(b.at(-1)!.toYmd).toBe("2026-05-31");
    for (let i = 1; i < b.length; i++) {
      const prevEnd = new Date(`${b[i - 1].toYmd}T00:00:00Z`).getTime();
      expect(new Date(`${b[i].fromYmd}T00:00:00Z`).getTime() - prevEnd).toBe(86400000);
    }
  });

  it("menolak input tidak valid & kolom berlebihan", () => {
    expect(() => buildPeriodBuckets("day", "2026-11-10", "2026-11-01")).toThrow(/sebelum/);
    expect(() => buildPeriodBuckets("day", "2026-13-01", "2026-11-01")).toThrow(/tidak valid/);
    expect(() => buildPeriodBuckets("day", "2026-02-30", "2026-03-01")).toThrow(/tidak valid/);
    expect(() => buildPeriodBuckets("day", "2026-01-01", "2026-03-01")).toThrow(/Terlalu banyak kolom/);
    expect(countPeriodBuckets("day", "2026-01-01", "2026-03-01")).toBe(60);
  });
});

describe("tanggal outlet (WIB)", () => {
  it("batas hari WIB dalam UTC", () => {
    expect(ymdRangeToIso("2026-11-01", "2026-11-30")).toEqual({ from: "2026-10-31T17:00:00.000Z", to: "2026-11-30T16:59:59.999Z" });
  });

  it("rentang bawaan per jenis periode", () => {
    expect(defaultSeriesRange("day", "2026-11-21")).toEqual({ fromYmd: "2026-11-01", toYmd: "2026-11-21" });
    expect(defaultSeriesRange("month", "2026-11-21")).toEqual({ fromYmd: "2026-01-01", toYmd: "2026-11-21" });
    expect(defaultSeriesRange("year", "2026-11-21")).toEqual({ fromYmd: "2022-01-01", toYmd: "2026-11-21" });
    expect(defaultSeriesRange("week", "2026-11-21")).toEqual({ fromYmd: "2026-09-28", toYmd: "2026-11-21" });
  });
});
