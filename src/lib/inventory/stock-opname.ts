import { db } from "@/db/client";
import { stockOpnames, stockOpnameItems, products, stockMovements } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { autoFillLowStockPurchaseOrders } from "@/lib/inventory/auto-po";

export interface CreateStockOpnameInput {
  outletId: string;
  warehouseId?: string;
  staffUserId?: string;
  items: { productId: string; actualQty: number }[];
}

/** Snapshot current system stock vs. counted actual stock — differences are applied when the opname is completed. */
export async function createStockOpname(input: CreateStockOpnameInput) {
  const [opname] = await db
    .insert(stockOpnames)
    .values({ outletId: input.outletId, warehouseId: input.warehouseId, staffUserId: input.staffUserId, status: "draft" })
    .returning();

  for (const item of input.items) {
    const [product] = await db.select().from(products).where(eq(products.id, item.productId)).limit(1);
    const systemQty = product?.stockQty ?? 0;
    await db.insert(stockOpnameItems).values({
      stockOpnameId: opname.id,
      productId: item.productId,
      systemQty,
      actualQty: item.actualQty,
      differenceQty: item.actualQty - systemQty,
    });
  }

  return opname;
}

/** Apply the counted differences to actual stock (adjustment stock movements) and lock the opname. */
export async function completeStockOpname(stockOpnameId: string) {
  const [opname] = await db.select().from(stockOpnames).where(eq(stockOpnames.id, stockOpnameId)).limit(1);
  if (!opname) throw new Error("Stock opname tidak ditemukan.");
  if (opname.status === "completed") throw new Error("Stock opname sudah selesai diproses.");

  const items = await db.select().from(stockOpnameItems).where(eq(stockOpnameItems.stockOpnameId, stockOpnameId));

  for (const item of items) {
    if (item.differenceQty === 0) continue;
    await db.insert(stockMovements).values({
      productId: item.productId,
      type: item.differenceQty > 0 ? "adjustment" : "waste",
      qty: item.differenceQty,
      note: `Stock opname ${new Date(opname.opnameDate).toLocaleDateString("id-ID")}`,
      staffUserId: opname.staffUserId,
    });
    await db
      .update(products)
      .set({ stockQty: sql`${products.stockQty} + ${item.differenceQty}` })
      .where(eq(products.id, item.productId));
  }

  const [updatedOpname] = await db.update(stockOpnames).set({ status: "completed" }).where(eq(stockOpnames.id, stockOpnameId)).returning();

  // A physical count can easily reveal a product is lower than the system thought — check
  // whether anything just crossed its minimum stock now that the correction is applied.
  await autoFillLowStockPurchaseOrders(opname.outletId);

  return { opname: updatedOpname, itemsApplied: items.filter((i) => i.differenceQty !== 0).length };
}
