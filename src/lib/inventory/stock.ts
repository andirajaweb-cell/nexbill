import { db, type DbOrTx } from "@/db/client";
import { products, stockMovements, recipes, recipeIngredients } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { onStockIn, onStockOut, orderUnitCost } from "./costing";

/**
 * Deduct stock for a sold item — follows the recipe/BOM if the product has
 * one (deducts raw ingredients; real HPP is computed later at journal-posting
 * time via computeItemCogs), otherwise deducts the product's own stock
 * directly. Shared by the standalone POS order flow and the unified rental
 * bill's mid-session F&B additions so both go through identical stock logic.
 * `dbc` (Task #61): pass a caller's open `tx` so the stock movement + qty update join that
 * caller's transaction (e.g. a void/refund that must not partially restock across a crash).
 */
export async function deductStockForItem(productId: string, qty: number, orderId: string, staffUserId?: string, dbc: DbOrTx = db) {
  const [recipe] = await dbc.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);

  if (recipe) {
    const ingredients = await dbc.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
    for (const ing of ingredients) {
      const deductQty = Math.round(((ing.qtyPerYield * qty) / Math.max(1, recipe.yieldQty)) * 100) / 100;
      // FIFO outlets: consume the oldest cost layers and remember what these units cost (HPP).
      const fifo = await onStockOut(dbc, { productId: ing.ingredientProductId, qty: Math.abs(deductQty) });
      await dbc.insert(stockMovements).values({
        productId: ing.ingredientProductId,
        type: "sale_out",
        qty: -Math.abs(deductQty),
        unitCost: fifo ? fifo.unitCost : null,
        note: `Bahan baku untuk resep (order ${orderId.slice(0, 8)})`,
        refOrderId: orderId,
        staffUserId,
      });
      await dbc
        .update(products)
        .set({ stockQty: sql`${products.stockQty} - ${deductQty}` })
        .where(eq(products.id, ing.ingredientProductId));
    }
    return;
  }

  const fifo = await onStockOut(dbc, { productId, qty: Math.abs(qty) });
  await dbc.insert(stockMovements).values({ productId, type: "sale_out", qty: -Math.abs(qty), unitCost: fifo ? fifo.unitCost : null, refOrderId: orderId, staffUserId });
  await dbc
    .update(products)
    .set({ stockQty: sql`${products.stockQty} - ${qty}` })
    .where(eq(products.id, productId));
}

/**
 * Receive stock from a purchase: logs a purchase_in movement, bumps stockQty,
 * and rolls the new landed unit cost into products.costPrice using a weighted
 * average against whatever's already on hand — so costPrice (and therefore
 * HPP/COGS at sale time via computeItemCogs) reflects a blended cost across
 * purchases at different prices rather than just the most recent one.
 */
export async function receiveStockForItem(
  productId: string,
  qty: number,
  landedUnitCost: number,
  refId: string,
  note: string,
  staffUserId?: string,
  dbc: DbOrTx = db
) {
  const [product] = await dbc.select().from(products).where(eq(products.id, productId)).limit(1);
  if (!product) throw new Error("Produk tidak ditemukan.");

  const existingQty = Math.max(0, product.stockQty);
  const existingValue = existingQty * (product.costPrice ?? 0);
  const incomingValue = qty * landedUnitCost;
  const newQty = existingQty + qty;
  const newCostPrice = newQty > 0 ? (existingValue + incomingValue) / newQty : landedUnitCost;

  await dbc.insert(stockMovements).values({ productId, type: "purchase_in", qty, unitCost: landedUnitCost, note, refOrderId: refId, staffUserId });
  await dbc
    .update(products)
    .set({ stockQty: sql`${products.stockQty} + ${qty}`, costPrice: Math.round(newCostPrice * 100) / 100 })
    .where(eq(products.id, productId));
  // FIFO outlets: this receipt becomes its own cost layer (costPrice is then re-derived from layers).
  await onStockIn(dbc, { productId, qty, unitCost: landedUnitCost, source: "purchase", refId, stockBefore: product.stockQty });

  return { newCostPrice };
}

/** Reverse a stock deduction (used by item-level void and bill-level void/refund). `dbc` (Task
 * #61): same tx-or-db pass-through as deductStockForItem above. */
export async function restockForItem(productId: string, qty: number, orderId: string, note = "Void/refund item", dbc: DbOrTx = db) {
  const [recipe] = await dbc.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);

  if (recipe) {
    const ingredients = await dbc.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
    for (const ing of ingredients) {
      const restoreQty = Math.round(((ing.qtyPerYield * qty) / Math.max(1, recipe.yieldQty)) * 100) / 100;
      // FIFO: returned units go back at the cost they left with on this order.
      await onStockIn(dbc, { productId: ing.ingredientProductId, qty: restoreQty, unitCost: await orderUnitCost(dbc, orderId, ing.ingredientProductId), source: "restock", refId: orderId });
      await dbc.insert(stockMovements).values({
        productId: ing.ingredientProductId,
        type: "adjustment",
        qty: restoreQty,
        note: `${note} (order ${orderId.slice(0, 8)}) — kembalikan bahan baku`,
        refOrderId: orderId,
      });
      await dbc
        .update(products)
        .set({ stockQty: sql`${products.stockQty} + ${restoreQty}` })
        .where(eq(products.id, ing.ingredientProductId));
    }
    return;
  }

  await onStockIn(dbc, { productId, qty, unitCost: await orderUnitCost(dbc, orderId, productId), source: "restock", refId: orderId });
  await dbc.insert(stockMovements).values({ productId, type: "adjustment", qty, note: `${note} (order ${orderId.slice(0, 8)})`, refOrderId: orderId });
  await dbc
    .update(products)
    .set({ stockQty: sql`${products.stockQty} + ${qty}` })
    .where(eq(products.id, productId));
}
