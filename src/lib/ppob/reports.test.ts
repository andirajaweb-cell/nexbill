import { describe, it, expect } from "vitest";
import { reconcilePpobSummary } from "./reports";

/**
 * PPOB summary reconciliation — the two invariants the pass-through accounting model depends on
 * (see the doc comment on reconcilePpobSummary in reports.ts and buildPpobCollectionLines/
 * buildPpobSettlementLines in engine.ts):
 *   totalPrincipal + totalFeeAdmin = totalUangMasuk
 *   totalSettlement + totalOutstandingPayable = totalPrincipal
 */
describe("reconcilePpobSummary", () => {
  it("passes for a fully-settled period (the current always-auto-settle flow)", () => {
    const ok = reconcilePpobSummary({
      totalPrincipal: 500_000,
      totalFeeAdmin: 25_000,
      totalUangMasuk: 525_000,
      totalSettlement: 500_000,
      totalOutstandingPayable: 0,
    });
    expect(ok).toBe(true);
  });

  it("passes when some principal is still pending settlement (future deferred-settlement flow)", () => {
    const ok = reconcilePpobSummary({
      totalPrincipal: 500_000,
      totalFeeAdmin: 25_000,
      totalUangMasuk: 525_000,
      totalSettlement: 300_000,
      totalOutstandingPayable: 200_000,
    });
    expect(ok).toBe(true);
  });

  it("fails if uangMasuk doesn't equal principal + feeAdmin", () => {
    const ok = reconcilePpobSummary({
      totalPrincipal: 500_000,
      totalFeeAdmin: 25_000,
      totalUangMasuk: 999_999,
      totalSettlement: 500_000,
      totalOutstandingPayable: 0,
    });
    expect(ok).toBe(false);
  });

  it("fails if settlement + outstanding doesn't equal principal (money silently lost or double-counted)", () => {
    const ok = reconcilePpobSummary({
      totalPrincipal: 500_000,
      totalFeeAdmin: 25_000,
      totalUangMasuk: 525_000,
      totalSettlement: 300_000,
      totalOutstandingPayable: 300_000, // should be 200,000
    });
    expect(ok).toBe(false);
  });

  it("passes for an all-zero (empty period) summary", () => {
    const ok = reconcilePpobSummary({
      totalPrincipal: 0,
      totalFeeAdmin: 0,
      totalUangMasuk: 0,
      totalSettlement: 0,
      totalOutstandingPayable: 0,
    });
    expect(ok).toBe(true);
  });
});
