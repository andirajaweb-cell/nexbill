import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  products,
  stockMovements,
  orderItems,
  purchaseOrderItems,
  purchaseReturns,
  stockOpnameItems,
  recipes,
  recipeIngredients,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

/**
 * Every table with a real FK to products.id — a product can only be hard-deleted once none of
 * these reference it, otherwise the DELETE would either throw a raw FK-violation error or, if the
 * constraint were ever loosened, silently orphan/corrupt historical sales, purchasing, stock-opname,
 * or recipe/BOM data. Keep this list in sync with schema.ts if a new table ever references products.
 */
async function findProductReferences(productId: string): Promise<string[]> {
  const checks: { label: string; count: Promise<{ id: string }[]> }[] = [
    { label: "riwayat transaksi penjualan", count: db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, productId)).limit(1) },
    { label: "riwayat mutasi stok", count: db.select({ id: stockMovements.id }).from(stockMovements).where(eq(stockMovements.productId, productId)).limit(1) },
    { label: "pesanan pembelian ke supplier", count: db.select({ id: purchaseOrderItems.id }).from(purchaseOrderItems).where(eq(purchaseOrderItems.productId, productId)).limit(1) },
    { label: "retur pembelian", count: db.select({ id: purchaseReturns.id }).from(purchaseReturns).where(eq(purchaseReturns.productId, productId)).limit(1) },
    { label: "riwayat stok opname", count: db.select({ id: stockOpnameItems.id }).from(stockOpnameItems).where(eq(stockOpnameItems.productId, productId)).limit(1) },
    { label: "resep/BOM (sebagai produk jadi)", count: db.select({ id: recipes.id }).from(recipes).where(eq(recipes.productId, productId)).limit(1) },
    { label: "resep/BOM (sebagai bahan)", count: db.select({ id: recipeIngredients.id }).from(recipeIngredients).where(eq(recipeIngredients.ingredientProductId, productId)).limit(1) },
  ];
  const results = await Promise.all(checks.map(async (c) => ({ label: c.label, rows: await c.count })));
  return results.filter((r) => r.rows.length > 0).map((r) => r.label);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRow(products, id, "Produk tidak ditemukan.");
    const body = await req.json();
    // outletId is intentionally never accepted from the body — a product can't be reassigned
    // to a different outlet through this route.
    delete body.outletId;
    const [row] = await db.update(products).set(body).where(eq(products.id, id)).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}

/**
 * Soft delete by default — sets isActive false rather than removing the row, since past order
 * line items (order_items etc.) reference this product by id and a real DELETE would either fail
 * on the FK or silently orphan/corrupt historical sales data. The Inventory page's confirm dialog
 * already says "Nonaktifkan" (deactivate) for exactly this reason. To bring a product back, PATCH
 * the same id with { isActive: true } — see the "Aktifkan" button in dashboard/inventory/page.tsx.
 *
 * Pass ?permanent=true to actually remove the row instead. Only allowed for a product that is
 * ALREADY inactive (deactivate first — this is a deliberate two-step so nobody hard-deletes a
 * product still in active use by mistake) and that has zero references across every table with a
 * real FK to products.id (see findProductReferences above). If it has any history, the row stays
 * and a friendly error names which kind of history is blocking it — the safe move at that point is
 * to just leave it deactivated, since the data itself (past sales, purchases, recipes) is still
 * live and needs the product row to stay resolvable.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, row: product } = await requireOwnedRow<typeof products.$inferSelect>(products, id, "Produk tidak ditemukan.");
    const permanent = req.nextUrl.searchParams.get("permanent") === "true";

    if (!permanent) {
      const [row] = await db.update(products).set({ isActive: false }).where(eq(products.id, id)).returning();
      return NextResponse.json(row);
    }

    if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Tidak punya izin untuk menghapus produk secara permanen." }, { status: 403 });
    }
    if (product.isActive) {
      return NextResponse.json({ error: "Nonaktifkan produk ini dulu sebelum menghapusnya secara permanen." }, { status: 400 });
    }
    const blockers = await findProductReferences(id);
    if (blockers.length > 0) {
      return NextResponse.json(
        {
          error: `Tidak bisa dihapus permanen — produk ini masih punya ${blockers.join(", ")}. Data tersebut butuh produk ini tetap ada agar riwayatnya tetap valid. Biarkan tetap nonaktif saja (sudah tidak muncul untuk transaksi baru).`,
        },
        { status: 409 }
      );
    }
    await db.delete(products).where(eq(products.id, id));
    return NextResponse.json({ ok: true, deleted: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
