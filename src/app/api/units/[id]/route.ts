import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { units, products, recipeIngredients } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Deleting a unit only removes it from the picker going forward — products
 * and recipeIngredients store the unit's `code` as free text (no FK), so
 * historical rows are unaffected. If the code is still in active use we
 * soft-hide it instead (isActive: false) so old data keeps a readable label
 * and nobody accidentally orphans a unit that's referenced everywhere.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus satuan." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(units).where(eq(units.id, id)).limit(1);
    if (!existing) return NextResponse.json({ ok: true }); // already gone
    if (existing.outletId !== session.outletId) return NextResponse.json({ error: "Satuan tidak ditemukan." }, { status: 404 });

    const [productInUse] = await db.select().from(products).where(eq(products.unit, existing.code)).limit(1);
    const [ingredientInUse] = await db.select().from(recipeIngredients).where(eq(recipeIngredients.unit, existing.code)).limit(1);
    if (productInUse || ingredientInUse) {
      const [hidden] = await db.update(units).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(units.id, id)).returning();
      return NextResponse.json({ ok: true, hidden: true, row: hidden });
    }

    await db.delete(units).where(eq(units.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
