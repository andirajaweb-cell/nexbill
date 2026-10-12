import { NextRequest, NextResponse } from "next/server";
import { asc, desc, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, platformVendorRecommendations, platformVendorRecommendationEvents } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { dailySeries, parseBenefits, summarizeEvents, type VendorRecEventRow } from "@/lib/vendor-recommendations/core";
import { parseVendorRecInput } from "@/lib/vendor-recommendations/fields";
import { isMissingTable } from "@/lib/vendor-recommendations/server";

const DAY = 86_400_000;

function authError(err: unknown) {
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
  return null;
}

/**
 * Daftar rekomendasi vendor + indikator performa:
 *   - 7 / 30 / 90 hari dari event mentah (dilihat outlet unik, klik, CTR, disembunyikan, klik per tombol);
 *   - sepanjang waktu dari agregat SQL;
 *   - deret harian 30 hari (WIB) dan outlet yang terakhir mengeklik (untuk tindak lanjut tim).
 * Konversi = pendaftaran terkonfirmasi (diisi manual dari dasbor vendor) ÷ outlet yang mengeklik.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();
    let recs;
    try {
      recs = await db.select().from(platformVendorRecommendations).orderBy(asc(platformVendorRecommendations.placement), asc(platformVendorRecommendations.sortOrder));
    } catch (err) {
      if (isMissingTable(err)) return NextResponse.json({ migrationMissing: true, items: [] });
      throw err;
    }
    const ids = recs.map((r) => r.id);
    const now = new Date();
    const since90 = new Date(now.getTime() - 90 * DAY).toISOString();
    const recent = ids.length
      ? await db
          .select({
            recommendationId: platformVendorRecommendationEvents.recommendationId,
            outletId: platformVendorRecommendationEvents.outletId,
            event: platformVendorRecommendationEvents.event,
            target: platformVendorRecommendationEvents.target,
            createdAt: platformVendorRecommendationEvents.createdAt,
          })
          .from(platformVendorRecommendationEvents)
          .where(gte(platformVendorRecommendationEvents.createdAt, since90))
      : [];
    const allTime = ids.length
      ? await db
          .select({
            recommendationId: platformVendorRecommendationEvents.recommendationId,
            event: platformVendorRecommendationEvents.event,
            total: sql<number>`count(*)::int`,
            outlets: sql<number>`count(distinct ${platformVendorRecommendationEvents.outletId})::int`,
          })
          .from(platformVendorRecommendationEvents)
          .where(inArray(platformVendorRecommendationEvents.recommendationId, ids))
          .groupBy(platformVendorRecommendationEvents.recommendationId, platformVendorRecommendationEvents.event)
      : [];
    const lastClicks = ids.length
      ? await db
          .select({
            recommendationId: platformVendorRecommendationEvents.recommendationId,
            outletId: platformVendorRecommendationEvents.outletId,
            last: sql<string>`max(${platformVendorRecommendationEvents.createdAt})`,
            clicks: sql<number>`count(*)::int`,
          })
          .from(platformVendorRecommendationEvents)
          .where(sql`${platformVendorRecommendationEvents.event} = 'click' and ${platformVendorRecommendationEvents.outletId} is not null`)
          .groupBy(platformVendorRecommendationEvents.recommendationId, platformVendorRecommendationEvents.outletId)
          .orderBy(desc(sql`max(${platformVendorRecommendationEvents.createdAt})`))
          .limit(300)
      : [];
    const outletIds = [...new Set(lastClicks.map((c) => c.outletId).filter((x): x is string => !!x))];
    const names = outletIds.length ? await db.select({ id: outlets.id, name: outlets.name }).from(outlets).where(inArray(outlets.id, outletIds)) : [];
    const nameOf = new Map(names.map((n) => [n.id, n.name]));

    const items = recs.map((r) => {
      const rows: VendorRecEventRow[] = recent.filter((e) => e.recommendationId === r.id);
      const at = (days: number) => summarizeEvents(rows, new Date(now.getTime() - days * DAY));
      const all = allTime.filter((a) => a.recommendationId === r.id);
      const pick = (ev: string) => all.find((a) => a.event === ev);
      const clickedAll = pick("click")?.outlets ?? 0;
      return {
        ...r,
        benefits: parseBenefits(r.benefitsJson),
        stats: {
          d7: at(7),
          d30: at(30),
          d90: at(90),
          allTime: {
            impressions: pick("impression")?.total ?? 0,
            outletsSeen: pick("impression")?.outlets ?? 0,
            clicks: pick("click")?.total ?? 0,
            outletsClicked: clickedAll,
            dismisses: pick("dismiss")?.total ?? 0,
          },
          conversion: clickedAll ? r.confirmedSignups / clickedAll : null,
          daily: dailySeries(rows, 30, now),
          recentClickers: lastClicks
            .filter((c) => c.recommendationId === r.id)
            .slice(0, 20)
            .map((c) => ({ outletId: c.outletId, outletName: c.outletId ? nameOf.get(c.outletId) ?? "(outlet dihapus)" : "-", last: c.last, clicks: c.clicks })),
        },
      };
    });
    return NextResponse.json({ migrationMissing: false, items });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json().catch(() => ({}));
    const { data, error } = parseVendorRecInput(body, false);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const [created] = await db
      .insert(platformVendorRecommendations)
      .values({ ...(data as typeof platformVendorRecommendations.$inferInsert), updatedBy: session.sub })
      .returning();
    return NextResponse.json(created);
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
