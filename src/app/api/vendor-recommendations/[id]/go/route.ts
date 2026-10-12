import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformVendorRecommendations } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { urlForTarget } from "@/lib/vendor-recommendations/core";
import { isMissingTable, recordVendorRecEvent } from "@/lib/vendor-recommendations/server";

/**
 * Tombol kartu rekomendasi: catat klik lalu teruskan (302) ke tautan resmi vendor.
 * ?target=primary|secondary|info. Tujuan SELALU diambil dari data rekomendasi di database (hanya
 * http/https), tidak pernah dari query — jadi route ini tidak bisa dipakai sebagai open redirect.
 * Kalau pencatatan gagal, pengguna tetap diteruskan.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fallback = new URL("/dashboard/ppob", req.url);
  try {
    const [rec] = await db.select().from(platformVendorRecommendations).where(eq(platformVendorRecommendations.id, id)).limit(1);
    const target = req.nextUrl.searchParams.get("target") ?? "primary";
    const url = rec ? urlForTarget(rec, target) : null;
    if (!rec || !url) return NextResponse.redirect(fallback, 302);
    try {
      const session = await getSession();
      if (session) {
        await recordVendorRecEvent({ recommendationId: rec.id, outletId: session.outletId, staffUserId: session.sub, event: "click", target });
      }
    } catch (logErr) {
      console.error("Gagal mencatat klik rekomendasi vendor:", logErr);
    }
    const res = NextResponse.redirect(url, 302);
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (err) {
    if (!isMissingTable(err)) console.error("Rekomendasi vendor /go gagal:", err);
    return NextResponse.redirect(fallback, 302);
  }
}
