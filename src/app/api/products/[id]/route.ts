import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

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
 * Soft delete only — sets isActive false rather than removing the row. Past order line items
 * (order_items etc.) reference this product by id, so a real DELETE would either fail on the FK
 * or silently orphan/corrupt historical sales data. The Inventory page's confirm dialog already
 * says "Nonaktifkan" (deactivate) for exactly this reason; this route just needs to match. To
 * bring a product back, PATCH the same id with { isActive: true } — see the "Aktifkan" button in
 * dashboard/inventory/page.tsx.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedRow(products, id, "Produk tidak ditemukan.");
    const [row] = await db.update(products).set({ isActive: false }).where(eq(products.id, id)).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
