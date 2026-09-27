import { describe, it, expect } from "vitest";
import { purchaseDateToIso } from "./purchasing";
import { outletDateYmd } from "@/lib/time/outlet-time";

describe("purchaseDateToIso — tanggal belanja", () => {
  it("pins a past date to 12:00 WIB so it stays on that calendar day", () => {
    const iso = purchaseDateToIso("2026-09-01");
    expect(iso).toBe("2026-09-01T05:00:00.000Z");
    expect(outletDateYmd(new Date(iso))).toBe("2026-09-01");
  });
  it("uses the current time for today and for an empty value", () => {
    const today = outletDateYmd(new Date());
    expect(outletDateYmd(new Date(purchaseDateToIso(today)))).toBe(today);
    expect(outletDateYmd(new Date(purchaseDateToIso(undefined)))).toBe(today);
  });
  it("rejects future and malformed dates", () => {
    expect(() => purchaseDateToIso("2999-01-01")).toThrow(/masa depan/);
    expect(() => purchaseDateToIso("01/09/2026")).toThrow(/tidak valid/);
  });
});
