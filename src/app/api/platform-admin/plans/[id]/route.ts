import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

const EDITABLE_FIELDS = [
  "name", "priceOriginal", "priceCurrent", "includedConsoles", "extraConsolePrice",
  "smartPlugPrice", "setupServicePrice", "isActive", "sortOrder", "unlimitedEntitlement",
] as const;

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
    const [updated] = await db.update(subscriptionPlans).set(patch).where(eq(subscriptionPlans.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
