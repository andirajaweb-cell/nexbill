import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

const EDITABLE_FIELDS = ["category", "name", "description", "price", "imageUrl", "isActive", "sortOrder", "weightGrams", "lengthCm", "widthCm", "heightCm"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    patch.updatedAt = new Date().toISOString();
    const [updated] = await db.update(platformProducts).set(patch).where(eq(platformProducts.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Soft-delete only (isActive: false) — a hard delete would break the itemized lineItemsJson on any past paid cart_order invoice that referenced this product's price/name at the time. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [updated] = await db.update(platformProducts).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(platformProducts.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, row: updated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
