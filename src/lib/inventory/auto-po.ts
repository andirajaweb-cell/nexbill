import { db } from "@/db/client";
import { products, purchaseOrders, purchaseOrderItems } from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";

const AUTO_PO_NOTE_MARKER = "Auto-generated: produk mencapai stok minimum";

export interface AutoFillResult {
  poCreated: number;
  poReused: number;
  itemsAdded: number;
  poIds: string[];
}

/**
 * "purchase order akan terisi otomatis apabila produk inventory berada di minimum stok" — for
 * every active product at/below its lowStockThreshold that has a preferredSupplierId set,
 * ensures a draft PO exists for that supplier with a line item for it.
 *
 * Idempotent by design (safe to call after every stock-decreasing event, not just once): a
 * product already covered by an existing OPEN PO (draft/ordered/partially_received) for its
 * preferred supplier — auto-generated or manually created by staff — is skipped rather than
 * getting a duplicate line item. Auto-generated draft POs are reused across runs (matched by the
 * AUTO_PO_NOTE_MARKER note) so repeated low-stock events for the same supplier accumulate onto
 * one draft PO instead of spawning a new one each time; the moment staff progresses that PO past
 * "draft" (ordered/received), the next run starts a fresh one if still needed.
 *
 * Products with no preferredSupplierId are intentionally left alone — the Purchase Order tab's
 * "Produk Perlu Restock" list is the fallback for those (see PurchaseOrderTab in
 * app/dashboard/inventory/page.tsx), since there's no supplier to auto-order from.
 *
 * Suggested order qty = lowStockThreshold - stockQty, floored at 1 (a product sitting exactly at
 * its own threshold still gets ordered, not skipped). unitCost is seeded from the product's last
 * known costPrice — a rough estimate for the draft; staff can edit it before actually sending
 * the PO to the supplier the same way any manually-created PO item can be adjusted today.
 */
export async function autoFillLowStockPurchaseOrders(outletId: string): Promise<AutoFillResult> {
  const allProducts = await db.select().from(products).where(and(eq(products.outletId, outletId), eq(products.isActive, true)));
  const eligible = allProducts.filter((p) => p.stockQty <= p.lowStockThreshold && p.preferredSupplierId);
  if (eligible.length === 0) return { poCreated: 0, poReused: 0, itemsAdded: 0, poIds: [] };

  const bySupplier = new Map<string, typeof eligible>();
  for (const p of eligible) {
    const arr = bySupplier.get(p.preferredSupplierId!) ?? [];
    arr.push(p);
    bySupplier.set(p.preferredSupplierId!, arr);
  }

  let poCreated = 0;
  let poReused = 0;
  let itemsAdded = 0;
  const poIds: string[] = [];

  for (const [supplierId, prods] of bySupplier) {
    const openPOs = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.outletId, outletId),
          eq(purchaseOrders.supplierId, supplierId),
          inArray(purchaseOrders.status, ["draft", "ordered", "partially_received"])
        )
      );
    const openPoIds = openPOs.map((po) => po.id);
    const existingItems = openPoIds.length
      ? await db.select().from(purchaseOrderItems).where(inArray(purchaseOrderItems.purchaseOrderId, openPoIds))
      : [];
    const alreadyCoveredProductIds = new Set(existingItems.map((i) => i.productId));

    const toAdd = prods.filter((p) => !alreadyCoveredProductIds.has(p.id));
    if (toAdd.length === 0) continue;

    let targetPo = openPOs.find((po) => po.status === "draft" && po.notes?.includes(AUTO_PO_NOTE_MARKER));
    if (!targetPo) {
      const [created] = await db
        .insert(purchaseOrders)
        .values({ outletId, supplierId, status: "draft", notes: AUTO_PO_NOTE_MARKER, totalAmount: 0 })
        .returning();
      targetPo = created;
      poCreated++;
    } else {
      poReused++;
    }
    poIds.push(targetPo.id);

    let addedAmount = 0;
    for (const p of toAdd) {
      const qty = Math.max(1, p.lowStockThreshold - p.stockQty);
      const unitCost = p.costPrice || 0;
      await db.insert(purchaseOrderItems).values({ purchaseOrderId: targetPo.id, productId: p.id, qtyOrdered: qty, unitCost });
      addedAmount += qty * unitCost;
      itemsAdded++;
    }
    await db
      .update(purchaseOrders)
      .set({ totalAmount: sql`${purchaseOrders.totalAmount} + ${addedAmount}` })
      .where(eq(purchaseOrders.id, targetPo.id));
  }

  return { poCreated, poReused, itemsAdded, poIds };
}

/** Active products at/below their own minimum stock — used by the Purchase Order tab's "Produk
 * Perlu Restock" list, regardless of whether they have a preferredSupplierId (that list is the
 * fallback for products the auto-fill above can't handle on its own). */
export async function listLowStockProducts(outletId: string) {
  const rows = await db.select().from(products).where(and(eq(products.outletId, outletId), eq(products.isActive, true)));
  return rows.filter((p) => p.stockQty <= p.lowStockThreshold);
}
