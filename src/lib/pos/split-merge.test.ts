import { describe, it, expect } from "vitest";
import { proportionalSlices } from "./split-merge";

/**
 * Bug fixed in splitOrderEvenly: every split-bill share used to get one flat itemType:"misc" line,
 * which revenueAccountIdForItem (lib/accounting/postings.ts) has no explicit route for — it fell
 * through to the same account genuine service charge/tax uses (COA 4650, "Pendapatan Lainnya"),
 * silently misclassifying 100% of every split share's revenue away from Rental/F&B/Produk. The fix
 * distributes each split share across proportional per-category buckets instead; proportionalSlices
 * is the arithmetic primitive that guarantees no rupiah is gained or lost while doing so.
 */
describe("proportionalSlices", () => {
  it("splits evenly when the whole divides cleanly", () => {
    expect(proportionalSlices(90, 3)).toEqual([30, 30, 30]);
  });

  it("absorbs the flooring remainder into the LAST slice, never losing or gaining a rupiah", () => {
    const slices = proportionalSlices(100, 3);
    expect(slices).toEqual([33, 33, 34]);
    expect(slices.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("handles zero cleanly (e.g. an order with no discount/tax/serviceCharge)", () => {
    expect(proportionalSlices(0, 4)).toEqual([0, 0, 0, 0]);
  });

  it("every slice set sums back to the original whole, across a range of odd splits", () => {
    for (const [whole, parts] of [[115000, 3], [7500, 2], [1, 7], [999999, 11]] as const) {
      const slices = proportionalSlices(whole, parts);
      expect(slices).toHaveLength(parts);
      expect(slices.reduce((a, b) => a + b, 0)).toBe(whole);
    }
  });

  it("a negative whole (e.g. a rare negative-discount edge case) still reconciles exactly", () => {
    const slices = proportionalSlices(-100, 3);
    expect(slices.reduce((a, b) => a + b, 0)).toBe(-100);
  });
});
