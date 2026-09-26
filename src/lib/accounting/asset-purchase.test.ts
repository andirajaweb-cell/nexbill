import { describe, it, expect } from "vitest";
import { planAssetPurchase, type AssetPurchaseItemInput } from "./asset-purchase";

/*
 * Pembelian Aset: satu jurnal (Dr Aset = total) dan satu fixed_asset per unit. Kalau jumlah harga
 * perolehan per unit tidak persis sama dengan total jurnal, register aset dan buku besar berselisih
 * sejak hari pertama — dan penyusutan menghitung dari angka register. Yang diuji di sini adalah sifat
 * itu, di atas kombinasi ongkos yang tidak habis dibagi.
 */

const item = (over: Partial<AssetPurchaseItemInput> = {}): AssetPurchaseItemInput => ({
  name: "PS5",
  category: "playstation",
  qty: 1,
  unitCost: 7_500_000,
  usefulLifeMonths: 48,
  ...over,
});

describe("planAssetPurchase", () => {
  it("capitalises ongkos into acquisition cost, proportional to each line's value", () => {
    const plan = planAssetPurchase([item({ qty: 2, unitCost: 7_500_000 }), item({ name: "TV 55", category: "tv", qty: 1, unitCost: 5_000_000 })], 400_000);
    expect(plan.total).toBe(20_400_000);
    // PS5 lines are 15jt of 20jt → 75% of ongkos = 300.000 over 2 units; TV gets 100.000.
    expect(plan.units.map((u) => u.cost)).toEqual([7_650_000, 7_650_000, 5_100_000]);
  });

  it("units always sum to the journal total, whatever the rounding", () => {
    for (const extra of [0, 1, 2, 99_999, 100_001, 333_333]) {
      for (const qty of [1, 3, 7]) {
        const plan = planAssetPurchase([item({ qty, unitCost: 1_000_001 }), item({ name: "Stik", category: "controller", qty: 3, unitCost: 849_999 })], extra);
        expect(plan.units).toHaveLength(qty + 3);
        expect(plan.units.reduce((s, u) => s + u.cost, 0)).toBe(plan.total);
        for (const u of plan.units) expect(Number.isInteger(u.cost)).toBe(true);
      }
    }
  });

  it("rejects invalid lines before anything is written", () => {
    expect(() => planAssetPurchase([])).toThrow(/minimal 1 barang/);
    expect(() => planAssetPurchase([item({ qty: 0 })])).toThrow(/qty/);
    expect(() => planAssetPurchase([item({ unitCost: 0 })])).toThrow(/harga satuan/);
    expect(() => planAssetPurchase([item({ usefulLifeMonths: 0 })])).toThrow(/umur ekonomis/);
    expect(() => planAssetPurchase([item({ salvageValue: 7_500_000 })])).toThrow(/Nilai sisa/);
    expect(() => planAssetPurchase([item({ qty: 2, rentalUnitId: "unit-1" })])).toThrow(/qty 1/);
  });
});
