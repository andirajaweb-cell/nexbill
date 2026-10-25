import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outletPublicProfiles, outlets } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { ensureOutletSlug } from "@/lib/outlets/slug";
import { getProfileRow, listPhotos, listWhatsappContacts, siblingOutletIds } from "@/lib/booking/public-profile";
import { cleanMapsUrl, isValidLatLng, parseLatLngFromText } from "@/lib/booking/public-profile-core";
import { canEditBookingProfile, requireBookingProfileEditor } from "@/lib/booking/profile-access";

/**
 * Profil halaman booking online outlet sesi login: foto, admin WhatsApp, titik lokasi.
 * GET: semua staf (hanya membaca). PUT { latitude, longitude, mapsUrl, showBranches }: Owner / Kelola Pengaturan.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;
    const [o] = await db.select({ slug: outlets.slug, address: outlets.address, phone: outlets.phone }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
    const slug = o?.slug ?? (await ensureOutletSlug(outletId));
    const [profile, photos, contacts, branches] = await Promise.all([getProfileRow(outletId), listPhotos([outletId]), listWhatsappContacts([outletId], false), siblingOutletIds(outletId)]);
    return NextResponse.json({
      slug,
      address: o?.address ?? null,
      outletPhone: o?.phone ?? null,
      profile: profile.value ? { latitude: profile.value.latitude, longitude: profile.value.longitude, mapsUrl: profile.value.mapsUrl, showBranches: profile.value.showBranches } : { latitude: null, longitude: null, mapsUrl: null, showBranches: true },
      photos: photos.value.map((p) => ({ id: p.id, url: p.url, caption: p.caption, sortOrder: p.sortOrder })),
      contacts: contacts.value.map((c) => ({ id: c.id, label: c.label, phone: c.phone, isActive: c.isActive, sortOrder: c.sortOrder })),
      branchCount: branches.length,
      canEdit: canEditBookingProfile(session.role),
      migrationMissing: profile.missing || photos.missing || contacts.missing || undefined,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireBookingProfileEditor();
    if (session instanceof NextResponse) return session;
    const body = await req.json().catch(() => ({}));
    const mapsUrl = cleanMapsUrl(body?.mapsUrl);
    let lat = body?.latitude === null || body?.latitude === "" ? null : Number(body?.latitude);
    let lng = body?.longitude === null || body?.longitude === "" ? null : Number(body?.longitude);
    if ((lat === null || lng === null) && mapsUrl) {
      const fromUrl = parseLatLngFromText(mapsUrl);
      if (fromUrl) ({ lat, lng } = fromUrl);
    }
    if (lat !== null || lng !== null) {
      if (!isValidLatLng(lat, lng)) return NextResponse.json({ error: "Titik lokasi tidak valid (lintang -90..90, bujur -180..180)." }, { status: 400 });
    }
    const values = { latitude: lat, longitude: lng, mapsUrl, showBranches: body?.showBranches !== false, updatedBy: session.sub };
    const now = new Date().toISOString();
    await db
      .insert(outletPublicProfiles)
      .values({ outletId: session.outletId, ...values, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: outletPublicProfiles.outletId, set: { ...values, updatedAt: now } });
    return NextResponse.json({ ok: true, latitude: lat, longitude: lng, mapsUrl });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
