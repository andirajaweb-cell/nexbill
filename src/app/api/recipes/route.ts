import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { recipes, recipeIngredients, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const productId = req.nextUrl.searchParams.get("productId");
    if (productId) {
      const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      // Product belongs to another outlet (or doesn't exist) — treat the same as "no recipe yet".
      if (!product || product.outletId !== session.outletId) return NextResponse.json(null);
      const [recipe] = await db.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);
      if (!recipe) return NextResponse.json(null);
      const ingredients = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
      return NextResponse.json({ ...recipe, ingredients });
    }

    // No productId filter — full list for the Resep/BOM tab. recipes has no outletId column of
    // its own, so scope it via the linked product's outlet, then enrich with the linked product's
    // name/category and each ingredient's product name so the UI doesn't need N+1 fetches.
    const outletProducts = await db.select().from(products).where(eq(products.outletId, session.outletId));
    const outletProductIds = outletProducts.map((p) => p.id);
    const rows = outletProductIds.length ? await db.select().from(recipes).where(inArray(recipes.productId, outletProductIds)) : [];
    const allIngredients = rows.length ? await db.select().from(recipeIngredients).where(inArray(recipeIngredients.recipeId, rows.map((r) => r.id))) : [];
    const productIds = [...new Set([...rows.map((r) => r.productId), ...allIngredients.map((i) => i.ingredientProductId)])];
    const relatedProducts = productIds.length ? await db.select().from(products).where(inArray(products.id, productIds)) : [];
    const productById = new Map(relatedProducts.map((p) => [p.id, p]));

    const enriched = rows.map((r) => ({
      ...r,
      product: productById.get(r.productId) ?? null,
      ingredients: allIngredients
        .filter((i) => i.recipeId === r.id)
        .map((i) => ({ ...i, ingredientProduct: productById.get(i.ingredientProductId) ?? null })),
    }));
    return NextResponse.json(enriched);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola resep/BOM." }, { status: 403 });
    }

    const { productId, name, yieldQty = 1, ingredients } = await req.json();
    if (!productId || !name) return NextResponse.json({ error: "Produk dan nama resep wajib diisi." }, { status: 400 });
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: "Minimal 1 bahan baku wajib diisi." }, { status: 400 });
    }

    const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!product || product.outletId !== session.outletId) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

    const [existing] = await db.select().from(recipes).where(eq(recipes.productId, productId)).limit(1);
    if (existing) return NextResponse.json({ error: "Produk ini sudah punya resep — edit resep yang ada, jangan buat baru." }, { status: 400 });

    const [recipe] = await db.insert(recipes).values({ productId, name, yieldQty }).returning();
    for (const ing of ingredients as { ingredientProductId: string; qtyPerYield: number; unit: string }[]) {
      await db.insert(recipeIngredients).values({ recipeId: recipe.id, ...ing });
    }
    return NextResponse.json(recipe);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
