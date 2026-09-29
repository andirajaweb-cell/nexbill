import { NextRequest, NextResponse } from "next/server";
import { inArray, or, sql } from "drizzle-orm";
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

    // Match on Place ID, and on name too — leads added manually or via the research seed have no
    // Place ID, and without the name check the same outlet would be imported a second time.
    const placeIds = results.map((r) => r.placeId);
    const names = [...new Set(results.map((r) => r.name.trim().toLowerCase()))];
    const existing = placeIds.length
      ? await db
          .select({ id: platformLeads.id, placeId: platformLeads.placeId, name: sql<string>`lower(trim(${platformLeads.name}))` })
          .from(platformLeads)
          .where(or(inArray(platformLeads.placeId, placeIds), inArray(sql`lower(trim(${platformLeads.name}))`, names)))
      : [];
    const leadIdByPlace = new Map(existing.filter((e) => e.placeId).map((e) => [e.placeId, e.id]));
    const leadIdByName = new Map(existing.map((e) => [e.name, e.id]));

    return NextResponse.json({
      results: results.map((r) => ({ ...r, existingLeadId: leadIdByPlace.get(r.placeId) ?? leadIdByName.get(r.name.trim().toLowerCase()) ?? null })),
      nextPageToken,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
