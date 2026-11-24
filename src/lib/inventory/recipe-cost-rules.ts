import { isStockTracked } from "./stock-tracking-rules";

export type CostSource = { costPrice: number | null; lowStockThreshold: number | null } | null | undefined;

/**
 * HPP per porsi sebuah resep — aturan yang sama dengan computeItemCogs (lib/accounting/postings.ts):
 * Σ(harga modal bahan × qty per yield) ÷ yield. Bahan "tidak dilacak" dilewati karena biayanya
 * dicatat lewat Pengeluaran, bukan diambil dari Persediaan. MURNI (dipakai juga oleh unit test).
 */
export function recipeUnitCost(yieldQty: number, ingredients: { qtyPerYield: number; product: CostSource }[]): number {
  let perYield = 0;
  for (const ing of ingredients) {
    if (!ing.product || !isStockTracked(ing.product)) continue;
    perYield += (ing.product.costPrice ?? 0) * (ing.qtyPerYield || 0);
  }
  return Math.round((perYield / Math.max(1, yieldQty || 1)) * 100) / 100;
}
