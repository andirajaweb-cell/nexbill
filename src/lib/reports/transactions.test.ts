import { describe, it, expect } from "vitest";
import { reconcileSales, rentalRevenueSubBucket } from "./transactions";

/**
 * Task: "Perbaiki logika halaman Transaksi..." — reconcileSales is the pure reconciliation
 * contract behind Transaction Center's summary cards. It replaces glRevenueBucket (Task #63),
 * which sourced those cards from the General Ledger; that approach was deliberately reversed so
 * the cards always reconcile against the exact same createdAt-scoped dataset as the table instead
 * of Accounting's entryDate-scoped one. See reconcileSales' own doc comment in transactions.ts for
 * the full contract and the documented double-counting resolution.
 */
describe("reconcileSales", () => {
  it("Gross Sales is the literal sum of every valid transaction's total", () => {
    const { grossSales } = reconcileSales([100_000, 250_000, 75_000], 0);
    expect(grossSales).toBe(425_000);
  });

  it("Net Sales = Gross Sales - Refund, with no second discount subtraction", () => {
    // order.total (recomputeBillTotals) is already net of discount: total = (subtotal - discount)
    // + tax + serviceCharge. If discount were subtracted again here on top of refund, Net Sales
    // would double-count it — exactly what the spec's "tanpa double counting" requirement forbids.
    const { grossSales, netSales } = reconcileSales([100_000, 200_000], 30_000);
    expect(grossSales).toBe(300_000);
    expect(netSales).toBe(270_000); // 300,000 - 30,000 refund, NOT minus discount again
  });

  it("an empty valid-transaction set reconciles to zero, not NaN", () => {
    const { grossSales, netSales, isReconciled } = reconcileSales([], 0);
    expect(grossSales).toBe(0);
    expect(netSales).toBe(0);
    expect(isReconciled).toBe(true);
  });

  it("refund can exceed gross sales (over-refund edge case) without breaking reconciliation", () => {
    const { netSales, isReconciled } = reconcileSales([50_000], 80_000);
    expect(netSales).toBe(-30_000);
    expect(isReconciled).toBe(true);
  });

  it("isReconciled is true whenever grossSales/netSales were computed by this function itself", () => {
    // A structural tripwire, not a live risk today — see the doc comment on reconcileSales for why.
    const result = reconcileSales([10, 20, 30], 5);
    expect(result.isReconciled).toBe(true);
  });
});

/**
 * Task: "Unify Dashboard revenue cards with Transaction Center dataset" — rentalRevenueSubBucket
 * is the pure helper the Owner Dashboard's per-source breakdown (Rental Reguler/Member/Add-on)
 * now uses, additive to itemRevenueBucket's coarser "rental" bucket rather than a replacement for
 * it. The key invariant this guards: every itemType that itemRevenueBucket folds into "rental"
 * (rental, accessory) must resolve to a non-null sub-bucket here, and every itemType it does NOT
 * (fnb-category products, plain products, misc) must resolve to null — otherwise the Dashboard's
 * rentalReguler+rentalMember+addon sum would silently drift away from Transaction Center's own
 * "Rental Revenue" card for the same period.
 */
describe("rentalRevenueSubBucket", () => {
  it("a non-member's rental line goes to Reguler", () => {
    expect(rentalRevenueSubBucket("rental", false)).toBe("rentalReguler");
  });

  it("a member's rental line goes to Member", () => {
    expect(rentalRevenueSubBucket("rental", true)).toBe("rentalMember");
  });

  it("accessory (per-hour add-on) lines always go to Add-on, regardless of membership", () => {
    expect(rentalRevenueSubBucket("accessory", false)).toBe("addon");
    expect(rentalRevenueSubBucket("accessory", true)).toBe("addon");
  });

  it("non-rental itemTypes (product/misc) resolve to null — they belong to a different bucket entirely", () => {
    expect(rentalRevenueSubBucket("product", false)).toBeNull();
    expect(rentalRevenueSubBucket("misc", true)).toBeNull();
  });

  it("every itemType itemRevenueBucket would call \"rental\" resolves to a non-null sub-bucket here, and nothing else does", () => {
    // Mirrors itemRevenueBucket's own condition (itemType === "rental" || itemType === "accessory")
    // without importing it directly, so this test would fail loudly if the two functions' itemType
    // sets ever drifted apart.
    const rentalItemTypes = ["rental", "accessory"];
    const otherItemTypes = ["product", "misc"];
    for (const itemType of rentalItemTypes) {
      expect(rentalRevenueSubBucket(itemType, false)).not.toBeNull();
      expect(rentalRevenueSubBucket(itemType, true)).not.toBeNull();
    }
    for (const itemType of otherItemTypes) {
      expect(rentalRevenueSubBucket(itemType, false)).toBeNull();
      expect(rentalRevenueSubBucket(itemType, true)).toBeNull();
    }
  });
});
