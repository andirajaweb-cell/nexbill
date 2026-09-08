import { describe, it, expect } from "vitest";
import { computePpobAmounts, reconcilePpobAmounts } from "./engine";

/**
 * PPOB pass-through/third-party accounting — computePpobAmounts is the single place that defines
 * the split between principal (modal + providerFee, owed to the provider, NEVER revenue) and
 * feeAdmin (NexBill's own margin, the ONLY revenue). See buildPpobCollectionLines/
 * buildPpobSettlementLines in engine.ts for how these numbers get posted to the ledger.
 */
describe("computePpobAmounts", () => {
  it("splits principal (modal + providerFee) from feeAdmin (margin) per the worked example in the spec", () => {
    // Rp100.000 transaction with Rp5.000 margin: Dr Cash 105.000 / Cr Payable 100.000 / Cr Revenue 5.000
    const { principal, feeAdmin, uangMasuk } = computePpobAmounts(100_000, 0, 5_000);
    expect(principal).toBe(100_000);
    expect(feeAdmin).toBe(5_000);
    expect(uangMasuk).toBe(105_000);
  });

  it("principal includes BOTH modal and providerFee — providerFee is never revenue", () => {
    const { principal, feeAdmin, uangMasuk } = computePpobAmounts(20_000, 2_000, 1_000);
    expect(principal).toBe(22_000); // 20,000 + 2,000 — NOT booked as expense+revenue gross-up anymore
    expect(feeAdmin).toBe(1_000);
    expect(uangMasuk).toBe(23_000);
  });

  it("degrades cleanly to a margin-only transaction when modal and providerFee are both zero", () => {
    const { principal, feeAdmin, uangMasuk } = computePpobAmounts(0, 0, 1_500);
    expect(principal).toBe(0);
    expect(feeAdmin).toBe(1_500);
    expect(uangMasuk).toBe(1_500);
  });

  it("handles a zero-margin transaction (pure pass-through, no NexBill revenue at all)", () => {
    const { principal, feeAdmin, uangMasuk } = computePpobAmounts(50_000, 1_000, 0);
    expect(principal).toBe(51_000);
    expect(feeAdmin).toBe(0);
    expect(uangMasuk).toBe(51_000);
  });

  it("uangMasuk is always exactly principal + feeAdmin, never independently drifting", () => {
    const { principal, feeAdmin, uangMasuk } = computePpobAmounts(12_345.678, 678.111, 111.222);
    expect(uangMasuk).toBeCloseTo(principal + feeAdmin, 2);
  });
});

describe("reconcilePpobAmounts", () => {
  it("passes for a correctly split set of amounts", () => {
    expect(reconcilePpobAmounts(100_000, 5_000, 105_000)).toBe(true);
  });

  it("fails when uangMasuk doesn't equal principal + feeAdmin", () => {
    expect(reconcilePpobAmounts(100_000, 5_000, 200_000)).toBe(false);
  });

  it("tolerates sub-cent floating point noise", () => {
    expect(reconcilePpobAmounts(100_000.001, 5_000, 105_000.0009)).toBe(true);
  });
});
