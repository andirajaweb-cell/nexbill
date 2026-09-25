import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeads } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { isPlacesConfigured, searchPlaces } from "@/lib/leads/places";

/** Whether GOOGLE_MAPS_API_KEY is set — lets the page show setup instructions instead of a failing search form. */
export async function GET() {
  try {
    await requirePlatformAdmin();
    return NextResponse.json({ configured: isPlacesConfigured() });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * One page of Google Maps results. Nothing is saved here — each result is annotated with the id of
 * the lead it already became (if any) so the page can mark duplicates; saving is a separate
 * explicit step (POST /api/platform-admin/leads/import).
 */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json();
    const textQuery = String(body.textQuery ?? "").trim();
    if (!textQuery) return NextResponse.json({ error: "Kata kunci pencarian wajib diisi." }, { status: 400 });

    const { results, nextPageToken } = await searchPlaces(textQuery, body.pageToken || undefined);

    const placeIds = results.map((r) => r.placeId);
    const existing = placeIds.length
      ? await db.select({ id: platformLeads.id, placeId: platformLeads.placeId }).from(platformLeads).where(inArray(platformLeads.placeId, placeIds))
      : [];
    const leadIdByPlace = new Map(existing.map((e) => [e.placeId, e.id]));

    return NextResponse.json({
      results: results.map((r) => ({ ...r, existingLeadId: leadIdByPlace.get(r.placeId) ?? null })),
      nextPageToken,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
