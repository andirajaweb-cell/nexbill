import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformVendorRecommendations } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { canSeeVendorRecs, isMissingTable, recordVendorRecEvent } from "@/lib/vendor-recommendations/server";

/**
 * Catat "dilihat" (impression) atau "disembunyikan" (dismiss) untuk kartu rekomendasi.
 * Body: { event: "impression" | "dismiss" }. Outlet SELALU dari sesi login, tidak pernah dari body.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!canSeeVendorRecs(session.role)) return NextResponse.json({ ok: false });
    const body = await req.json().catch(() => ({}));
    const event = body?.event;
    if (event !== "impression" && event !== "dismiss") return NextResponse.json({ error: "Event tidak dikenal." }, { status: 400 });
    try {
      const [rec] = await db.select({ id: platformVendorRecommendations.id }).from(platformVendorRecommendations).where(eq(platformVendorRecommendations.id, id)).limit(1);
      if (!rec) return NextResponse.json({ error: "Rekomendasi tidak ditemukan." }, { status: 404 });
      const recorded = await recordVendorRecEvent({ recommendationId: id, outletId: session.outletId, staffUserId: session.sub, event });
      return NextResponse.json({ ok: true, recorded });
    } catch (err) {
      if (isMissingTable(err)) return NextResponse.json({ ok: false });
      throw err;
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
