import { describe, expect, it } from "vitest";
import { netInventoryValue } from "./inventory-postings";

describe("netInventoryValue", () => {
  it("values a stock count loss at harga modal", () => {
    // 20 botol hilang @ Rp3.500
    expect(netInventoryValue([{ qtyDelta: -20, unitCost: 3500 }])).toBe(-70000);
  });

  it("nets gains against losses within one opname", () => {
    expect(
      netInventoryValue([
        { qtyDelta: -4, unitCost: 2500 }, // -10.000
        { qtyDelta: 3, unitCost: 1000 }, //   +3.000
      ])
    ).toBe(-7000);
  });

  it("is zero when the product has no harga modal", () => {
    expect(netInventoryValue([{ qtyDelta: 12, unitCost: 0 }])).toBe(0);
  });

  it("rounds to rupiah cents", () => {
    expect(netInventoryValue([{ qtyDelta: 3, unitCost: 1234.567 }])).toBe(3703.7);
  });
});
