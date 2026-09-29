import { describe, expect, it } from "vitest";
import { computeBusyHours, type BusyHourInput } from "./busy-hours";

/** n transaksi di jam `hour` pada setiap tanggal dalam `days`. */
function tx(hour: number, days: string[], perDay = 1): BusyHourInput[] {
  return days.flatMap((ymd) => Array.from({ length: perDay }, () => ({ hour, ymd })));
}
const days = (n: number) => Array.from({ length: n }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`);

describe("computeBusyHours", () => {
  it("transaksi nyasar di luar jam operasional tidak jadi jam sepi", () => {
    const d = days(20);
    const rows = [
      ...tx(13, d, 3), // ramai: 3/hari
      ...tx(10, d, 1), // sepi tapi rutin: 1/hari
      ...tx(21, d, 2),
      { hour: 9, ymd: d[0] }, // sekali sebulan
    ];
    const r = computeBusyHours(rows);
    expect(r.activeDays).toBe(20);
    expect(r.busiest?.hour).toBe(13);
    expect(r.busiest?.avgPerDay).toBe(3);
    expect(r.quietest?.hour).toBe(10);
    expect(r.hours[9].operating).toBe(false);
    expect(r.hours[9].count).toBe(1);
  });

  it("rata-rata per hari dibagi hari aktif, dibulatkan 1 desimal", () => {
    const d = days(3);
    const r = computeBusyHours([...tx(12, d, 1), { hour: 12, ymd: d[0] }, ...tx(15, d, 1)]);
    expect(r.hours[12].count).toBe(4);
    expect(r.hours[12].avgPerDay).toBe(1.3);
  });

  it("data sangat sedikit: tetap memilih dari jam yang ada transaksinya", () => {
    const r = computeBusyHours([
      { hour: 14, ymd: "2026-09-01" },
      { hour: 14, ymd: "2026-09-01" },
      { hour: 19, ymd: "2026-09-01" },
    ]);
    expect(r.activeDays).toBe(1);
    expect(r.busiest?.hour).toBe(14);
    expect(r.quietest?.hour).toBe(19);
  });

  it("hanya satu jam aktif → tidak ada jam sepi", () => {
    const r = computeBusyHours(tx(13, days(5), 2));
    expect(r.busiest?.hour).toBe(13);
    expect(r.quietest).toBeNull();
  });

  it("tanpa transaksi", () => {
    const r = computeBusyHours([]);
    expect(r.activeDays).toBe(0);
    expect(r.busiest).toBeNull();
    expect(r.quietest).toBeNull();
    expect(r.hours).toHaveLength(24);
  });
});
