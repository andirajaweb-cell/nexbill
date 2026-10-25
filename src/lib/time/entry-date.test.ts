import { describe, it, expect } from "vitest";
import { isTodayYmd, ymdToEntryIso } from "./entry-date";

const NOW = new Date("2026-10-25T05:00:00Z"); // 12.00 WIB, 25 Okt

describe("tanggal Setoran Kas / Pindah Kas", () => {
  it("hari ini = waktu sekarang, tanggal lampau = 12.00 WIB", () => {
    expect(ymdToEntryIso("", NOW)).toBe(NOW.toISOString());
    expect(ymdToEntryIso("2026-10-25", NOW)).toBe(NOW.toISOString());
    expect(ymdToEntryIso("2026-10-20", NOW)).toBe("2026-10-20T05:00:00.000Z");
  });
  it("menolak masa depan & format salah", () => {
    expect(() => ymdToEntryIso("2026-10-26", NOW)).toThrow(/masa depan/);
    expect(() => ymdToEntryIso("25/10/2026", NOW)).toThrow(/tidak valid/);
  });
  it("hanya hari ini yang ditautkan ke shift", () => {
    expect(isTodayYmd(null, NOW)).toBe(true);
    expect(isTodayYmd("2026-10-25", NOW)).toBe(true);
    expect(isTodayYmd("2026-10-24", NOW)).toBe(false);
  });
});
