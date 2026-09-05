import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { productCategories, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Deleting a category only removes it from the picker going forward — products stores the
 * category's `code` as free text (no FK), so historical rows are unaffected. If the code is
 * still in active use by any product, soft-hide it instead (isActive: false) so old data keeps
 * a readable category and nobody accidentally orphans a category that's referenced everywhere.
 * Mirrors /api/units/[id]'s DELETE handler.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus kategori produk." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(productCategories).where(eq(productCategories.id, id)).limit(1);
    if (!existing) return NextResponse.json({ ok: true }); // already gone
    if (existing.outletId !== session.outletId) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });

    const [productInUse] = await db.select().from(products).where(eq(products.category, existing.code)).limit(1);
    if (productInUse) {
      const [hidden] = await db.update(productCategories).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(productCategories.id, id)).returning();
      return NextResponse.json({ ok: true, hidden: true, row: hidden });
    }

    await db.delete(productCategories).where(eq(productCategories.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
