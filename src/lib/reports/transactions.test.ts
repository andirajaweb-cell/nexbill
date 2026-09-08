import { describe, it, expect } from "vitest";
import { reconcileSales } from "./transactions";

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
