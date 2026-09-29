import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { platformWaTemplates } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** Tandai template dipakai (usage_count + 1) — dipanggil saat admin membuka WhatsApp dari detail lead. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    await db
      .update(platformWaTemplates)
      .set({ usageCount: sql`${platformWaTemplates.usageCount} + 1`, lastUsedAt: new Date().toISOString() })
      .where(eq(platformWaTemplates.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
