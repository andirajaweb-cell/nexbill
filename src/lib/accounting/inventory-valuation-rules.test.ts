import { describe, expect, it } from "vitest";
import { costRevaluationDelta, valueStock, type ValuationProduct } from "./inventory-valuation-rules";

const p = (over: Partial<ValuationProduct>): ValuationProduct => ({ id: "x", name: "Teh", stockQty: 0, costPrice: 3000, category: "fnb", lowStockThreshold: 5, ...over });

describe("valueStock", () => {
  it("stok positif × harga modal; stok minus dipisah; sewa & tidak dilacak dikecualikan", () => {
    const v = valueStock([
      p({ id: "a", name: "Teh", stockQty: 10, costPrice: 3000 }),
      p({ id: "b", name: "Kopi", stockQty: -4, costPrice: 5000 }),
      p({ id: "c", name: "PS5", stockQty: 2, costPrice: 7_000_000, category: "device_rental" }),
      p({ id: "d", name: "Es batu", stockQty: 50, costPrice: 500, lowStockThreshold: -1 }),
      p({ id: "e", name: "Kacang", stockQty: 3, costPrice: null }),
    ]);
    expect(v.stockValue).toBe(30000);
    expect(v.negativeValue).toBe(-20000);
    expect(v.negativeStock).toEqual([{ name: "Kopi", stockQty: -4 }]);
  });

  it("outlet FIFO memakai nilai lapisan tersisa, bukan stok × harga rata-rata", () => {
    const v = valueStock([p({ id: "a", stockQty: 10, costPrice: 3000 })], new Map([["a", 32500]]));
    expect(v.stockValue).toBe(32500);
  });
});

describe("costRevaluationDelta", () => {
  it("stok × selisih harga; stok 0/minus tidak dinilai ulang", () => {
    expect(costRevaluationDelta(12, 3000, 3500)).toBe(6000);
    expect(costRevaluationDelta(12, 3500, 3000)).toBe(-6000);
    expect(costRevaluationDelta(0, 3000, 3500)).toBe(0);
    expect(costRevaluationDelta(-5, 3000, 3500)).toBe(0);
    expect(costRevaluationDelta(4, null, 2500)).toBe(10000);
  });
});
