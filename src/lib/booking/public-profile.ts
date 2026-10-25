import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { outletMemberships, outletPublicPhotos, outletPublicProfiles, outlets, outletWhatsappContacts, staffUsers } from "@/db/schema";
import { resolveOutletDisplayName } from "@/lib/outlets/membership";
import { normalizePhone } from "./no-show-core";
import { directionsUrl, isValidLatLng, mapEmbedUrl } from "./public-profile-core";

/**
 * Profil publik halaman booking: foto outlet, admin WhatsApp, lokasi (geo tag) dan cabang lain milik
 * pemilik yang sama. Tabel dari migrasi 0036 — sebelum dijalankan semuanya kosong dan halaman booking
 * memakai nomor outlet seperti sebelumnya.
 */

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "42P01" || e?.cause?.code === "42P01" || /outlet_public_profiles|outlet_public_photos|outlet_whatsapp_contacts/i.test(e?.message ?? "");
}

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ value: T; missing: boolean }> {
  try {
    return { value: await fn(), missing: false };
  } catch (err) {
    if (isMissingTable(err)) return { value: fallback, missing: true };
    throw err;
  }
}

export async function getProfileRow(outletId: string) {
  return safe(async () => (await db.select().from(outletPublicProfiles).where(eq(outletPublicProfiles.outletId, outletId)).limit(1))[0] ?? null, null);
}

export async function listPhotos(outletIds: string[]) {
  if (!outletIds.length) return { value: [] as (typeof outletPublicPhotos.$inferSelect)[], missing: false };
  return safe(() => db.select().from(outletPublicPhotos).where(inArray(outletPublicPhotos.outletId, outletIds)).orderBy(asc(outletPublicPhotos.sortOrder), asc(outletPublicPhotos.createdAt)), []);
}

export async function listWhatsappContacts(outletIds: string[], activeOnly = true) {
  if (!outletIds.length) return { value: [] as (typeof outletWhatsappContacts.$inferSelect)[], missing: false };
  return safe(async () => {
    const rows = await db.select().from(outletWhatsappContacts).where(inArray(outletWhatsappContacts.outletId, outletIds)).orderBy(asc(outletWhatsappContacts.sortOrder), asc(outletWhatsappContacts.createdAt));
    return activeOnly ? rows.filter((r) => r.isActive) : rows;
  }, []);
}

/** Outlet lain (aktif, punya link booking) milik Owner yang sama — "cabang". */
export async function siblingOutletIds(outletId: string): Promise<string[]> {
  // Owner outlet ini: outlet utamanya = outlet ini, atau tertaut lewat outletMemberships.
  const viaMembership = await db
    .select({ id: staffUsers.id, home: staffUsers.outletId })
    .from(outletMemberships)
    .innerJoin(staffUsers, eq(staffUsers.id, outletMemberships.staffUserId))
    .where(and(eq(outletMemberships.outletId, outletId), eq(staffUsers.role, "owner")));
  const viaHome = await db.select({ id: staffUsers.id, home: staffUsers.outletId }).from(staffUsers).where(and(eq(staffUsers.outletId, outletId), eq(staffUsers.role, "owner")));
  const owners = [...viaMembership, ...viaHome];
  if (!owners.length) return [];
  const linked = await db.select({ id: outletMemberships.outletId }).from(outletMemberships).where(inArray(outletMemberships.staffUserId, [...new Set(owners.map((o) => o.id))]));
  const ids = new Set([...owners.map((o) => o.home), ...linked.map((r) => r.id)]);
  ids.delete(outletId);
  if (!ids.size) return [];
  const rows = await db.select({ id: outlets.id, isActive: outlets.isActive, slug: outlets.slug }).from(outlets).where(inArray(outlets.id, [...ids]));
  return rows.filter((r) => r.isActive && r.slug).map((r) => r.id);
}

export interface PublicContact {
  label: string;
  phone: string;
}

function contactsOf(outlet: { phone: string | null }, rows: { label: string; phone: string }[]): PublicContact[] {
  const list = rows.map((r) => ({ label: r.label, phone: normalizePhone(r.phone) })).filter((r) => r.phone);
  if (list.length) return list;
  const fallback = normalizePhone(outlet.phone);
  return fallback ? [{ label: "", phone: fallback }] : [];
}

/** Data publik untuk /book/[slug] — hanya kolom yang memang untuk umum. */
export async function getPublicBookingProfile(slug: string) {
  const [outlet] = await db.select().from(outlets).where(eq(outlets.slug, slug)).limit(1);
  if (!outlet) return null;
  const profile = await getProfileRow(outlet.id);
  const showBranches = profile.value?.showBranches ?? true;
  const branchIds = showBranches ? await siblingOutletIds(outlet.id) : [];
  const allIds = [outlet.id, ...branchIds];
  const [photos, contacts, branchRows, branchProfiles] = await Promise.all([
    listPhotos(allIds),
    listWhatsappContacts(allIds),
    branchIds.length ? db.select().from(outlets).where(inArray(outlets.id, branchIds)) : Promise.resolve([]),
    branchIds.length ? safe(() => db.select().from(outletPublicProfiles).where(inArray(outletPublicProfiles.outletId, branchIds)), []) : Promise.resolve({ value: [], missing: false }),
  ]);
  const p = profile.value;
  const geo = { latitude: p?.latitude ?? null, longitude: p?.longitude ?? null, mapsUrl: p?.mapsUrl ?? null, address: outlet.address };
  const branchProfileById = new Map(branchProfiles.value.map((r) => [r.outletId, r]));
  const branches = await Promise.all(
    branchRows.map(async (b) => {
      const bp = branchProfileById.get(b.id);
      return {
        name: await resolveOutletDisplayName(b.id),
        slug: b.slug!,
        address: b.address,
        city: b.city,
        photoUrl: photos.value.find((ph) => ph.outletId === b.id)?.url ?? b.logoUrl ?? null,
        contacts: contactsOf(b, contacts.value.filter((c) => c.outletId === b.id)),
        directionsUrl: directionsUrl({ latitude: bp?.latitude, longitude: bp?.longitude, mapsUrl: bp?.mapsUrl, address: b.address }),
      };
    })
  );
  branches.sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }));
  return {
    photos: photos.value.filter((ph) => ph.outletId === outlet.id).map((ph) => ({ id: ph.id, url: ph.url, caption: ph.caption })),
    contacts: contactsOf(outlet, contacts.value.filter((c) => c.outletId === outlet.id)),
    location: {
      hasPin: isValidLatLng(geo.latitude, geo.longitude),
      directionsUrl: directionsUrl(geo),
      embedUrl: mapEmbedUrl(geo),
    },
    branches,
  };
}
