import { describe, it, expect } from "vitest";
import { planFifoIssue, summarizeLayers } from "./costing";

/*
 * FIFO: barang keluar menghabiskan lapisan tertua lebih dulu. Sifat yang dijaga:
 *  - HPP = jumlah (qty diambil × harga lapisannya), bukan qty × rata-rata;
 *  - nilai lapisan tersisa + HPP = nilai lapisan sebelum keluar (tidak ada rupiah hilang/tercipta),
 *    sehingga saldo Persediaan di buku besar tetap sama dengan nilai lapisan.
 */

const layers = [
  { id: "a", qtyRemaining: 10, unitCost: 3000 },
  { id: "b", qtyRemaining: 10, unitCost: 4000 },
];

describe("planFifoIssue", () => {
  it("takes the oldest layer first and spills into the next", () => {
    const plan = planFifoIssue(layers, 12, 9999);
    expect(plan.takes).toEqual([
      { id: "a", qty: 10, unitCost: 3000 },
      { id: "b", qty: 2, unitCost: 4000 },
    ]);
    expect(plan.cost).toBe(38_000);
    expect(plan.shortfall).toBe(0);
    expect(plan.unitCost).toBeCloseTo(38_000 / 12);
  });

  it("values units not covered by any layer at the fallback cost", () => {
    const plan = planFifoIssue(layers, 25, 5000);
    expect(plan.shortfall).toBe(5);
    expect(plan.cost).toBe(10 * 3000 + 10 * 4000 + 5 * 5000);
  });

  it("skips empty layers and handles fractional recipe quantities", () => {
    const plan = planFifoIssue([{ id: "x", qtyRemaining: 0, unitCost: 1 }, { id: "y", qtyRemaining: 1.5, unitCost: 2000 }], 0.25, 0);
    expect(plan.takes).toEqual([{ id: "y", qty: 0.25, unitCost: 2000 }]);
    expect(plan.cost).toBe(500);
  });

  it("conserves value: issued cost + remaining layer value = value before", () => {
    const before = summarizeLayers(layers).value;
    for (const qty of [1, 7, 10, 13, 20]) {
      const plan = planFifoIssue(layers, qty, 0);
      const remaining = layers.map((l) => ({ ...l, qtyRemaining: l.qtyRemaining - (plan.takes.find((t) => t.id === l.id)?.qty ?? 0) }));
      expect(plan.cost + summarizeLayers(remaining).value).toBeCloseTo(before);
    }
  });
});

describe("summarizeLayers", () => {
  it("gives harga modal as remaining value ÷ remaining qty", () => {
    const s = summarizeLayers([{ qtyRemaining: 8, unitCost: 4000 }, { qtyRemaining: 0, unitCost: 1 }]);
    expect(s).toEqual({ qty: 8, value: 32_000, unitCost: 4000 });
  });
});
