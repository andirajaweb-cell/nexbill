import { describe, it, expect, vi } from "vitest";
vi.mock("@/db/client", () => ({ db: {} }));
import { reconcilePayables } from "./payables";

describe("reconcilePayables", () => {
  const balances = [
    { accountId: "a2111", code: "2111", name: "Supplier Payable", balance: 500_000 },
    { accountId: "a2163", code: "2163", name: "Expense Payable", balance: 300_000 },
  ];
  it("cocok bila dokumen = saldo buku besar", () => {
    const rows = reconcilePayables(balances, [{ type: "purchase_invoice", amount: 500_000 }, { type: "expense", amount: 200_000 }, { type: "asset_purchase", amount: 100_000 }], { purchase_invoice: "a2111", expense: "a2163", asset_purchase: "a2163" });
    expect(rows.every((r) => r.diff === 0)).toBe(true);
    expect(rows).toHaveLength(2);
  });
  it("selisih bila buku besar punya hutang tanpa dokumen", () => {
    const rows = reconcilePayables(balances, [{ type: "expense", amount: 100_000 }], { purchase_invoice: "a2111", expense: "a2163", asset_purchase: "a2163" });
    expect(rows.find((r) => r.code === "2163")?.diff).toBe(200_000);
    expect(rows.find((r) => r.code === "2111")?.diff).toBe(500_000);
  });
});
