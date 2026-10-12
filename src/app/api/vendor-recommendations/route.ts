import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, gte } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, platformVendorRecommendations, platformVendorRecommendationEvents } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { DISMISS_DAYS, VENDOR_REC_PLACEMENTS, isLive, matchesCountry, toPublic } from "@/lib/vendor-recommendations/core";
import { canSeeVendorRecs, isMissingTable } from "@/lib/vendor-recommendations/server";

/**
 * Kartu rekomendasi vendor untuk satu halaman dashboard (?placement=ppob). Hanya untuk Owner/Manager,
 * hanya yang aktif & sesuai negara outlet, dan tidak menampilkan yang baru disembunyikan outlet ini
 * (DISMISS_DAYS hari). Outlet SELALU dari sesi login. URL tujuan tidak dikirim — tombol membuka
 * /api/vendor-recommendations/[id]/go supaya klik tercatat sebagai indikator performa.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!canSeeVendorRecs(session.role)) return NextResponse.json({ items: [] });
    const placement = req.nextUrl.searchParams.get("placement") ?? "ppob";
    if (!(VENDOR_REC_PLACEMENTS as readonly string[]).includes(placement)) return NextResponse.json({ items: [] });

    const outletId = session.outletId;
    const [outlet] = await db.select({ country: outlets.outletCountry }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
    try {
      const recs = await db
        .select()
        .from(platformVendorRecommendations)
        .where(and(eq(platformVendorRecommendations.placement, placement), eq(platformVendorRecommendations.isActive, true)))
        .orderBy(asc(platformVendorRecommendations.sortOrder));
      const since = new Date(Date.now() - DISMISS_DAYS * 86_400_000).toISOString();
      const dismissed = await db
        .select({ id: platformVendorRecommendationEvents.recommendationId })
        .from(platformVendorRecommendationEvents)
        .where(
          and(
            eq(platformVendorRecommendationEvents.outletId, outletId),
            eq(platformVendorRecommendationEvents.event, "dismiss"),
            gte(platformVendorRecommendationEvents.createdAt, since)
          )
        );
      const hidden = new Set(dismissed.map((d) => d.id));
      const items = recs.filter((r) => isLive(r) && matchesCountry(r.countries, outlet?.country) && !hidden.has(r.id)).map(toPublic);
      return NextResponse.json({ items });
    } catch (err) {
      if (isMissingTable(err)) return NextResponse.json({ items: [] });
      throw err;
    }
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
