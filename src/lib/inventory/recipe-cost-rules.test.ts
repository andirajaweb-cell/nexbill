import { describe, expect, it } from "vitest";
import { recipeUnitCost } from "./recipe-cost-rules";

describe("recipeUnitCost — harga modal produk resep = HPP per porsi", () => {
  it("menjumlah harga modal bahan × qty lalu dibagi yield", () => {
    const mie = { costPrice: 2786, lowStockThreshold: 5 };
    const telur = { costPrice: 1750, lowStockThreshold: 5 };
    expect(recipeUnitCost(1, [{ qtyPerYield: 1, product: mie }, { qtyPerYield: 1, product: telur }])).toBe(4536);
    expect(recipeUnitCost(1, [{ qtyPerYield: 2, product: mie }])).toBe(5572);
    expect(recipeUnitCost(4, [{ qtyPerYield: 1, product: { costPrice: 1000, lowStockThreshold: 0 } }])).toBe(250);
  });

  it("bahan tidak dilacak & bahan terhapus dilewati (sama dengan computeItemCogs)", () => {
    expect(recipeUnitCost(1, [{ qtyPerYield: 1, product: { costPrice: 500, lowStockThreshold: -1 } }, { qtyPerYield: 1, product: null }])).toBe(0);
  });

  it("yield 0/kosong dianggap 1 dan hasil dibulatkan 2 desimal", () => {
    expect(recipeUnitCost(0, [{ qtyPerYield: 1, product: { costPrice: 10, lowStockThreshold: 0 } }])).toBe(10);
    expect(recipeUnitCost(3, [{ qtyPerYield: 1, product: { costPrice: 10, lowStockThreshold: 0 } }])).toBe(3.33);
  });
});
