import { db } from "@/db/client";
import { products, recipes, recipeIngredients } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { isStockTracked } from "./stock-tracking-rules";
import { recipeUnitCost } from "./recipe-cost-rules";
import { costRevaluationDelta } from "@/lib/accounting/inventory-valuation-rules";
import { postCostRevaluationJournal } from "@/lib/accounting/inventory-revaluation";

type ProductRow = typeof products.$inferSelect;

/**
 * Harga modal produk hasil resep = HPP per porsi resepnya, otomatis — tidak diisi manual. Dipanggil
 * saat resep dibuat/diubah dan setiap kali daftar produk dimuat (harga modal bahan bisa berubah
 * lewat Belanja Supplier, FIFO, atau edit produk). Hanya baris yang angkanya berbeda yang ditulis.
 *
 * `rows` = semua produk outlet bila sudah dimuat pemanggil (menghemat satu query). Mengembalikan
 * baris produk dengan harga modal terbaru.
 */
export async function syncRecipeProductCosts(outletId: string, rows?: ProductRow[]): Promise<ProductRow[]> {
  const all = rows ?? (await db.select().from(products).where(eq(products.outletId, outletId)));
  if (all.length === 0) return all;
  const byId = new Map(all.map((p) => [p.id, p]));
  const recipeRows = await db.select().from(recipes).where(inArray(recipes.productId, all.map((p) => p.id)));
  if (recipeRows.length === 0) return all;
  const ingredientRows = await db.select().from(recipeIngredients).where(inArray(recipeIngredients.recipeId, recipeRows.map((r) => r.id)));

  const changes: { product: ProductRow; cost: number }[] = [];
  for (const r of recipeRows) {
    const product = byId.get(r.productId);
    if (!product) continue;
    const cost = recipeUnitCost(
      r.yieldQty,
      ingredientRows.filter((i) => i.recipeId === r.id).map((i) => ({ qtyPerYield: i.qtyPerYield, product: byId.get(i.ingredientProductId) }))
    );
    if (Math.abs((product.costPrice ?? 0) - cost) > 0.005) changes.push({ product, cost });
  }
  if (changes.length === 0) return all;

  await db.transaction(async (tx) => {
    const reval: { name: string; delta: number }[] = [];
    for (const { product, cost } of changes) {
      await tx.update(products).set({ costPrice: cost }).where(eq(products.id, product.id));
      // Produk resep biasanya stoknya 0 (yang dipotong stok bahan). Bila masih ada stok tercatat,
      // nilai Persediaan ikut dinilai ulang supaya Neraca tetap = stok × harga modal.
      if (isStockTracked(product) && product.category !== "device_rental") {
        const delta = costRevaluationDelta(product.stockQty, product.costPrice, cost);
        if (delta !== 0) reval.push({ name: product.name, delta });
      }
    }
    if (reval.length > 0) {
      await postCostRevaluationJournal({ outletId, items: reval, reference: `REVAL-RESEP-${new Date().toISOString().slice(0, 10)}` }, tx);
    }
  });

  const updated = new Map(changes.map((c) => [c.product.id, c.cost]));
  return all.map((p) => (updated.has(p.id) ? { ...p, costPrice: updated.get(p.id)! } : p));
}
