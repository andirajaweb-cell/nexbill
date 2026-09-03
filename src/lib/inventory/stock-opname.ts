import { db } from "@/db/client";
import { stockOpnames, stockOpnameItems, products, stockMovements } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { autoFillLowStockPurchaseOrders } from "@/lib/inventory/auto-po";

// Bounds how many stock updates run in parallel per Promise.all batch below — a full physical
// count can easily span an outlet's entire catalog, and firing that many concurrent queries
// unbounded risks exhausting the DB connection pool (see db/client.ts's note on the transaction
// pooler's small `max`). Chosen to match the same chunk size used in inventory/import.ts.
const PARALLEL_CHUNK_SIZE = 20;

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

  // Was one SELECT + one INSERT per counted product, sequentially — a full-catalog physical
  // count did 2x the SKU count in round trips. Now one batch SELECT (inArray) to snapshot
  // current system stock, then a single bulk INSERT for every counted line.
  const productIds = input.items.map((i) => i.productId);
  const productRows = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
  const stockQtyById = new Map(productRows.map((p) => [p.id, p.stockQty]));

  const rows = input.items.map((item) => {
    const systemQty = stockQtyById.get(item.productId) ?? 0;
    return {
      stockOpnameId: opname.id,
      productId: item.productId,
      systemQty,
      actualQty: item.actualQty,
      differenceQty: item.actualQty - systemQty,
    };
  });
  if (rows.length > 0) await db.insert(stockOpnameItems).values(rows);

  return opname;
}

/** Apply the counted differences to actual stock (adjustment stock movements) and lock the opname. */
export async function completeStockOpname(stockOpnameId: string) {
  const [opname] = await db.select().from(stockOpnames).where(eq(stockOpnames.id, stockOpnameId)).limit(1);
  if (!opname) throw new Error("Stock opname tidak ditemukan.");
  if (opname.status === "completed") throw new Error("Stock opname sudah selesai diproses.");

  const items = await db.select().from(stockOpnameItems).where(eq(stockOpnameItems.stockOpnameId, stockOpnameId));
  const changed = items.filter((i) => i.differenceQty !== 0);

  // stockMovements rows are independent of each other — one bulk insert instead of N.
  if (changed.length > 0) {
    await db.insert(stockMovements).values(
      changed.map((item) => ({
        productId: item.productId,
        type: item.differenceQty > 0 ? ("adjustment" as const) : ("waste" as const),
        qty: item.differenceQty,
        note: `Stock opname ${new Date(opname.opnameDate).toLocaleDateString("id-ID")}`,
        staffUserId: opname.staffUserId,
      }))
    );
  }
  // The stockQty update itself has a different delta per product (via sql`... + ${delta}`), so
  // it can't collapse into one statement without a hand-rolled SQL CASE — chunked-parallel
  // instead of sequential is still a large win without risking the pool (see PARALLEL_CHUNK_SIZE).
  for (let i = 0; i < changed.length; i += PARALLEL_CHUNK_SIZE) {
    const chunk = changed.slice(i, i + PARALLEL_CHUNK_SIZE);
    await Promise.all(
      chunk.map((item) =>
        db.update(products).set({ stockQty: sql`${products.stockQty} + ${item.differenceQty}` }).where(eq(products.id, item.productId))
      )
    );
  }

  const [updatedOpname] = await db.update(stockOpnames).set({ status: "completed" }).where(eq(stockOpnames.id, stockOpnameId)).returning();

  // A physical count can easily reveal a product is lower than the system thought — check
  // whether anything just crossed its minimum stock now that the correction is applied.
  await autoFillLowStockPurchaseOrders(opname.outletId);

  return { opname: updatedOpname, itemsApplied: items.filter((i) => i.differenceQty !== 0).length };
}
