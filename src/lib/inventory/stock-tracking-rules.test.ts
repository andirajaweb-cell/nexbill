import { describe, expect, it } from "vitest";
import { isStockTracked, sanitizeLowStockThreshold, UNTRACKED_STOCK_THRESHOLD } from "./stock-tracking-rules";

describe("lacak stok per produk", () => {
  it("penanda", () => {
    expect(isStockTracked({ lowStockThreshold: 5 })).toBe(true);
    expect(isStockTracked({ lowStockThreshold: 0 })).toBe(true);
    expect(isStockTracked({ lowStockThreshold: UNTRACKED_STOCK_THRESHOLD })).toBe(false);
    expect(isStockTracked(null)).toBe(true);
  });
  it("edit produk tidak bisa diam-diam mengubah status lacak", () => {
    expect(sanitizeLowStockThreshold(undefined, 5)).toBeUndefined();
    expect(sanitizeLowStockThreshold(10, -1)).toBe(-1);
    expect(sanitizeLowStockThreshold(-3, 5)).toBe(5);
    expect(sanitizeLowStockThreshold("7", 5)).toBe(7);
    expect(sanitizeLowStockThreshold("abc", 5)).toBe(5);
  });
});
