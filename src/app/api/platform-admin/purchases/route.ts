import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformPurchases, platformProducts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/**
 * NEXBILL's own purchasing/procurement ledger — smart plugs and other physical products it buys
 * from suppliers to resell/fulfill via /platform-admin/products. Completely separate from any
 * outlet's own purchasing (src/db/schema.ts "SUPPLIERS & PURCHASING" section) — no outletId here
 * at all, this is platform-level COGS for Digitrajasa as the hardware seller.
 */
export async function GET(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const periodMonth = req.nextUrl.searchParams.get("periodMonth");
    const rows = await db.select().from(platformPurchases).orderBy(desc(platformPurchases.purchaseDate));
    const filtered = periodMonth ? rows.filter((r) => r.purchaseDate.slice(0, 7) === periodMonth) : rows;
    const totalThisMonth = filtered
      .filter((r) => r.purchaseDate.slice(0, 7) === (periodMonth ?? new Date().toISOString().slice(0, 7)))
      .reduce((s, r) => s + r.totalCost, 0);
    return NextResponse.json({ purchases: rows, totalThisMonth });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json();
    if (!body.purchaseDate || !body.category || !body.itemName || body.unitCost == null) {
      return NextResponse.json({ error: "purchaseDate, category, itemName, dan unitCost wajib diisi." }, { status: 400 });
    }
    if (!["smart_plug", "other_product"].includes(body.category)) {
      return NextResponse.json({ error: "category tidak valid." }, { status: 400 });
    }
    if (body.productId) {
      const [product] = await db.select({ id: platformProducts.id }).from(platformProducts).where(eq(platformProducts.id, body.productId)).limit(1);
      if (!product) return NextResponse.json({ error: "Produk katalog tidak ditemukan." }, { status: 400 });
    }
    const qty = Math.max(1, Number(body.qty) || 1);
    const unitCost = Number(body.unitCost) || 0;
    const [row] = await db
      .insert(platformPurchases)
      .values({
        purchaseDate: body.purchaseDate,
        category: body.category,
        productId: body.productId || null,
        itemName: body.itemName,
        supplierName: body.supplierName || null,
        qty,
        unitCost,
        totalCost: Math.round(qty * unitCost * 100) / 100,
        note: body.note || null,
        createdBy: session.sub,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
