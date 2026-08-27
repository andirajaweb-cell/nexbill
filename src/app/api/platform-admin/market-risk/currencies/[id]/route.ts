import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { marketRiskCurrencies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

const EDITABLE_FIELDS = ["label", "langCode", "apiRateIdrPerUnit", "manualRateIdrPerUnit", "markupPercent", "isActive"] as const;

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
    const [updated] = await db.update(marketRiskCurrencies).set(patch).where(eq(marketRiskCurrencies.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Mata uang tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [deleted] = await db.delete(marketRiskCurrencies).where(eq(marketRiskCurrencies.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Mata uang tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
