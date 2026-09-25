import { describe, expect, it } from "vitest";
import { prorateLandedCosts } from "./purchasing";
import { additionalCostOf } from "./purchase-invoice-correction";

describe("prorateLandedCosts", () => {
  it("spreads ongkos by each line's share of the subtotal", () => {
    const { itemsSubtotal, grandTotal, lineBreakdown } = prorateLandedCosts(
      [
        { productId: "a", qty: 10, unitCost: 3000 }, // 30.000 → 75% share
        { productId: "b", qty: 5, unitCost: 2000 }, //  10.000 → 25% share
      ],
      8000
    );
    expect(itemsSubtotal).toBe(40000);
    expect(grandTotal).toBe(48000);
    expect(lineBreakdown[0].landedUnitCost).toBe(3600); // 3000 + 6000/10
    expect(lineBreakdown[1].landedUnitCost).toBe(2400); // 2000 + 2000/5
  });

  it("treats negative ongkos as 0", () => {
    const { grandTotal, lineBreakdown } = prorateLandedCosts([{ productId: "a", qty: 2, unitCost: 500 }], -100);
    expect(grandTotal).toBe(1000);
    expect(lineBreakdown[0].landedUnitCost).toBe(500);
  });
});

describe("additionalCostOf", () => {
  it("recovers the ongkos an invoice's landed costs were built from", () => {
    const { lineBreakdown } = prorateLandedCosts(
      [
        { productId: "a", qty: 3, unitCost: 7000 },
        { productId: "b", qty: 7, unitCost: 1500 },
      ],
      12345
    );
    expect(additionalCostOf(lineBreakdown)).toBe(12345);
  });

  it("is 0 for a PO invoice where landed cost equals unit cost", () => {
    expect(additionalCostOf([{ qty: 4, unitCost: 2500, landedUnitCost: 2500 }])).toBe(0);
  });
});
