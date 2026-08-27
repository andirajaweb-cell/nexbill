import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { recipes, recipeIngredients, products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

async function assertOwnedRecipe(recipeId: string, outletId: string) {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, recipeId)).limit(1);
  if (!recipe) return null;
  const [product] = await db.select({ outletId: products.outletId }).from(products).where(eq(products.id, recipe.productId)).limit(1);
  if (!product || product.outletId !== outletId) return null;
  return recipe;
}

/** Updates name/yieldQty and, if `ingredients` is provided, fully replaces the ingredient list (simplest correct semantics for a small BOM — no partial-row PATCH). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola resep/BOM." }, { status: 403 });
    }

    const { id } = await params;
    if (!(await assertOwnedRecipe(id, session.outletId))) return NextResponse.json({ error: "Resep tidak ditemukan." }, { status: 404 });
    const { name, yieldQty, ingredients } = await req.json();

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (yieldQty !== undefined) patch.yieldQty = yieldQty;

    let recipe: typeof recipes.$inferSelect | null = null;
    if (Object.keys(patch).length > 0) {
      [recipe] = await db.update(recipes).set(patch).where(eq(recipes.id, id)).returning();
      if (!recipe) return NextResponse.json({ error: "Resep tidak ditemukan." }, { status: 404 });
    } else {
      [recipe] = await db.select().from(recipes).where(eq(recipes.id, id)).limit(1);
      if (!recipe) return NextResponse.json({ error: "Resep tidak ditemukan." }, { status: 404 });
    }

    if (Array.isArray(ingredients)) {
      if (ingredients.length === 0) return NextResponse.json({ error: "Minimal 1 bahan baku wajib diisi." }, { status: 400 });
      await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
      for (const ing of ingredients as { ingredientProductId: string; qtyPerYield: number; unit: string }[]) {
        await db.insert(recipeIngredients).values({ recipeId: id, ...ing });
      }
    }

    return NextResponse.json(recipe);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola resep/BOM." }, { status: 403 });
    }

    const { id } = await params;
    if (!(await assertOwnedRecipe(id, session.outletId))) return NextResponse.json({ error: "Resep tidak ditemukan." }, { status: 404 });
    await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, id));
    const [row] = await db.delete(recipes).where(eq(recipes.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Resep tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, row });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
