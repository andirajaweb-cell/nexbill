import { describe, it, expect } from "vitest";
import { ppobAmounts, marginFromPrice } from "./amounts";

describe("ppobAmounts", () => {
  it("top up DANA 50.000, admin provider 500, margin 1.500", () => {
    const a = ppobAmounts({ nominal: 50_000, providerFee: 500, margin: 1_500 });
    expect(a.modal).toBe(50_000);
    expect(a.uangKeluar).toBe(50_500);
    expect(a.uangMasuk).toBe(52_000);
  });
  it("modal berbeda dari nominal (pulsa)", () => {
    const a = ppobAmounts({ nominal: 50_000, modal: 49_200, providerFee: 0, margin: 2_800 });
    expect(a.uangKeluar).toBe(49_200);
    expect(a.uangMasuk).toBe(52_000);
  });
  it("harga jual → margin, termasuk rugi", () => {
    expect(marginFromPrice(52_000, 50_000, 500)).toBe(1_500);
    expect(marginFromPrice(50_000, 50_000, 500)).toBe(-500);
  });
});
