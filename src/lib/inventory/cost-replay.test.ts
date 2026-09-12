import { describe, it, expect } from "vitest";
import { replayCostPrice, type ReplayableMovement } from "./cost-replay";

describe("replayCostPrice", () => {
  it("blends a simple sequence of purchases into a weighted average", () => {
    const movements: ReplayableMovement[] = [
      { qty: 10, unitCost: 100, createdAt: "2026-01-01T00:00:00Z" },
      { qty: 10, unitCost: 200, createdAt: "2026-01-02T00:00:00Z" },
    ];
    const result = replayCostPrice(movements);
    expect(result.qty).toBe(20);
    expect(result.costPrice).toBe(150); // (10*100 + 10*200) / 20
  });

  it("does not change the cost basis on an outflow — only reduces qty", () => {
    const movements: ReplayableMovement[] = [
      { qty: 10, unitCost: 100, createdAt: "2026-01-01T00:00:00Z" },
      { qty: -4, unitCost: null, createdAt: "2026-01-02T00:00:00Z" }, // sale
    ];
    const result = replayCostPrice(movements);
    expect(result.qty).toBe(6);
    expect(result.costPrice).toBe(100); // unchanged by the sale
  });

  it("excluding a specific invoice's movements reproduces the cost as if it never happened", () => {
    // Simulates reverseInvoiceEffects: the caller filters OUT every movement tied to the invoice
    // being voided (both the original purchase_in and the offsetting reversal adjustment share
    // the same refOrderId and get excluded together upstream) before calling replayCostPrice.
    const allMovements = [
      { qty: 10, unitCost: 100, createdAt: "2026-01-01T00:00:00Z", refOrderId: "inv-A" },
      { qty: 5, unitCost: 400, createdAt: "2026-01-02T00:00:00Z", refOrderId: "inv-B" }, // the invoice being voided
      { qty: 10, unitCost: 120, createdAt: "2026-01-03T00:00:00Z", refOrderId: "inv-C" },
    ];
    const withInvoiceB = replayCostPrice(allMovements);
    // (10*100 + 5*400 + 10*120) / 25 = (1000+2000+1200)/25 = 168
    expect(withInvoiceB.costPrice).toBe(168);

    const excludingInvoiceB = replayCostPrice(allMovements.filter((m) => m.refOrderId !== "inv-B"));
    // (10*100 + 10*120) / 20 = 110 — as if inv-B's purchase never happened.
    expect(excludingInvoiceB.qty).toBe(20);
    expect(excludingInvoiceB.costPrice).toBe(110);
  });

  it("blends a legacy movement with unknown (null) unitCost at the running average instead of 0", () => {
    const movements: ReplayableMovement[] = [
      { qty: 10, unitCost: 100, createdAt: "2026-01-01T00:00:00Z" },
      { qty: 5, unitCost: null, createdAt: "2026-01-02T00:00:00Z" }, // legacy row, cost unknown
    ];
    const result = replayCostPrice(movements);
    expect(result.qty).toBe(15);
    // Unknown cost blends in at the current running average (100) — a neutral assumption, so the
    // average is unchanged rather than being dragged toward 0.
    expect(result.costPrice).toBe(100);
  });

  it("qty never goes negative even if outflows exceed recorded inflows", () => {
    const movements: ReplayableMovement[] = [
      { qty: 5, unitCost: 50, createdAt: "2026-01-01T00:00:00Z" },
      { qty: -8, unitCost: null, createdAt: "2026-01-02T00:00:00Z" },
    ];
    const result = replayCostPrice(movements);
    expect(result.qty).toBe(0);
  });

  it("replays out of chronological input order correctly (sorts by createdAt first)", () => {
    const movements: ReplayableMovement[] = [
      { qty: 10, unitCost: 200, createdAt: "2026-01-02T00:00:00Z" },
      { qty: 10, unitCost: 100, createdAt: "2026-01-01T00:00:00Z" },
    ];
    const result = replayCostPrice(movements);
    expect(result.qty).toBe(20);
    expect(result.costPrice).toBe(150);
  });
});
