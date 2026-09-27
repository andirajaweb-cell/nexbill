import { describe, it, expect } from "vitest";
import { incomeDateToIso } from "./other-income";
import { purchaseDateToIso } from "@/lib/inventory/purchasing";
import { outletDateYmd } from "@/lib/time/outlet-time";

/* Tanggal yang diisi di form (Pendapatan Lain-lain, Belanja Supplier) harus menjadi tanggal jurnal
   pada hari kalender yang sama (WIB), bukan hari input dan bukan bergeser karena zona waktu. */
describe.each([
  ["incomeDateToIso", incomeDateToIso],
  ["purchaseDateToIso", purchaseDateToIso],
])("%s", (_name, fn) => {
  it("pins a past date to 12:00 WIB on that day", () => {
    const iso = fn("2026-09-01");
    expect(iso).toBe("2026-09-01T05:00:00.000Z");
    expect(outletDateYmd(new Date(iso))).toBe("2026-09-01");
  });
  it("uses now for today and for an empty value", () => {
    const today = outletDateYmd(new Date());
    expect(outletDateYmd(new Date(fn(today)))).toBe(today);
    expect(outletDateYmd(new Date(fn(undefined)))).toBe(today);
  });
  it("rejects future dates", () => {
    expect(() => fn("2999-01-01")).toThrow(/masa depan/);
  });
});
