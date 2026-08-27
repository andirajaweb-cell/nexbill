import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { affiliateProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

const EDITABLE_FIELDS = ["title", "description", "imageUrl", "shopeeUrl", "priceLabel", "category", "isActive", "sortOrder"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    patch.updatedBy = session.sub;
    patch.updatedAt = new Date().toISOString();
    const [updated] = await db.update(affiliateProducts).set(patch).where(eq(affiliateProducts.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Hard delete — these are pure outbound links with no invoice/order history tied to them, unlike platformProducts. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [deleted] = await db.delete(affiliateProducts).where(eq(affiliateProducts.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
