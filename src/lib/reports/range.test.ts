import { describe, it, expect } from "vitest";
import { daysInRange, normalizeReportRange } from "./range";

/*
 * Dulu laporan membandingkan "2026-09-30" dengan timestamp ISO sebagai string: transaksi pukul
 * 10.00 tanggal 30 ("2026-09-30T03:00:00Z") > "2026-09-30", jadi seluruh hari terakhir hilang.
 */
describe("normalizeReportRange", () => {
  it("turns plain dates into full WIB day boundaries", () => {
    const r = normalizeReportRange("2026-09-01", "2026-09-30");
    expect(r.from).toBe("2026-08-31T17:00:00.000Z"); // 1 Sep 00:00 WIB
    expect(r.to).toBe("2026-09-30T16:59:59.999Z"); // 30 Sep 23:59:59.999 WIB
  });
  it("keeps a sale on the last day inside the range", () => {
    const { to } = normalizeReportRange("2026-09-01", "2026-09-30");
    const lastDaySale = new Date("2026-09-30T20:30:00+07:00").toISOString();
    expect(lastDaySale <= to!).toBe(true);
    expect(lastDaySale <= "2026-09-30").toBe(false); // the old comparison
  });
  it("passes ISO through and treats blanks as open-ended", () => {
    expect(normalizeReportRange("2026-09-01T00:00:00.000Z", null).from).toBe("2026-09-01T00:00:00.000Z");
    expect(normalizeReportRange("", undefined)).toEqual({ from: undefined, to: undefined });
  });
});

describe("daysInRange", () => {
  it("counts calendar days inclusively", () => {
    const r = normalizeReportRange("2026-09-01", "2026-09-30");
    expect(daysInRange(r.from!, r.to!)).toBe(30);
    const d = normalizeReportRange("2026-09-27", "2026-09-27");
    expect(daysInRange(d.from!, d.to!)).toBe(1);
  });
});
