import { db } from "@/db/client";
import { products, stockMovements, recipes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { lockEntity } from "@/lib/accounting/journal";
import { postInventoryAdjustmentJournal } from "@/lib/accounting/inventory-postings";
import { DEFAULT_LOW_STOCK_THRESHOLD, isStockTracked, UNTRACKED_STOCK_THRESHOLD } from "./stock-tracking-rules";

/**
 * Nyalakan/matikan "Lacak stok" untuk satu produk (lihat stock-tracking-rules.ts).
 *
 * Mematikan: stok sistem (termasuk yang minus) dinolkan dengan gerakan "adjustment" dan nilai
 * Persediaannya dikoreksi ke ekuitas (sama dengan stock opname — tidak masuk Laba Rugi), lalu
 * produk ditandai tidak dilacak. Menyalakan: produk mulai dilacak dari stok 0 — isi stok lewat
 * Belanja Supplier atau Mode Hitung Stok.
 */
export async function setStockTracking(productId: string, tracked: boolean, staffUserId?: string) {
  return db.transaction(async (tx) => {
    await lockEntity(tx, `product_stock:${productId}`);
    const [p] = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!p) throw Object.assign(new Error("Produk tidak ditemukan."), { status: 404 });
    if (isStockTracked(p) === tracked) return { product: p, zeroed: 0 };

    if (tracked) {
      const [row] = await tx.update(products).set({ lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD, updatedAt: new Date().toISOString() }).where(eq(products.id, productId)).returning();
      return { product: row, zeroed: 0 };
    }

    const [recipe] = await tx.select({ id: recipes.id }).from(recipes).where(eq(recipes.productId, productId)).limit(1);
    if (recipe) {
      throw Object.assign(new Error("Produk ini punya resep — stoknya sudah tidak dipotong (yang dipotong bahan bakunya). Matikan Lacak stok di bahan bakunya bila perlu."), { status: 400 });
    }

    const delta = -p.stockQty;
    if (delta !== 0) {
      await tx.insert(stockMovements).values({ productId, type: "adjustment", qty: delta, note: "Lacak stok dimatikan — stok dinolkan", staffUserId });
      await tx.update(products).set({ stockQty: 0 }).where(eq(products.id, productId));
      await postInventoryAdjustmentJournal(
        {
          outletId: p.outletId,
          reason: "opname",
          lines: [{ productId, qtyDelta: delta }],
          reference: `TRK-${productId.slice(0, 8)}`,
          description: `Lacak stok dimatikan — ${p.name}`,
          sourceId: productId,
          staffUserId,
        },
        tx
      );
    }
    const [row] = await tx
      .update(products)
      .set({ lowStockThreshold: UNTRACKED_STOCK_THRESHOLD, lowStockNotifiedAt: null, updatedAt: new Date().toISOString() })
      .where(eq(products.id, productId))
      .returning();
    return { product: row, zeroed: delta };
  });
}
