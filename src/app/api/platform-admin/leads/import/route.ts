import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformLeads } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import type { PlaceResult } from "@/lib/leads/constants";

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Saves selected Google Maps results as CRM leads (status "baru"). Places already in the CRM are
 * skipped via the unique place_id index, so re-importing the same search is harmless.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json();
    const places: Partial<PlaceResult>[] = Array.isArray(body.places) ? body.places : [];
    const searchQuery = str(body.searchQuery);

    const rows = places
      .filter((p) => str(p.placeId) && str(p.name))
      .map((p) => ({
        placeId: str(p.placeId),
        source: "google_maps" as const,
        searchQuery,
        name: str(p.name)!,
        category: str(p.category),
        address: str(p.address),
        city: str(p.city),
        phone: str(p.phone),
        waNumber: str(p.waNumber),
        website: str(p.website),
        mapsUrl: str(p.mapsUrl),
        lat: num(p.lat),
        lng: num(p.lng),
        rating: num(p.rating),
        reviewCount: num(p.reviewCount),
        businessStatus: str(p.businessStatus),
        createdBy: session.sub,
      }));

    if (rows.length === 0) return NextResponse.json({ error: "Tidak ada hasil yang dipilih." }, { status: 400 });

    const inserted = await db
      .insert(platformLeads)
      .values(rows)
      .onConflictDoNothing({ target: platformLeads.placeId })
      .returning({ id: platformLeads.id });

    return NextResponse.json({ inserted: inserted.length, skipped: rows.length - inserted.length });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
