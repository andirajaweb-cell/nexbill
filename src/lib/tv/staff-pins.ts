/**
 * PIN per staf untuk NEXBILL TV (migrasi 0038). Kasir mengetik PIN-nya sendiri di TV; server yang
 * mencocokkan (hash tidak pernah dikirim ke TV) dan mengembalikan siapa stafnya. Sesi dari TV lalu
 * tercatat atas nama staf itu. PIN layar bersama (Pengaturan › TV Screensaver) tetap berlaku sebagai
 * PIN cadangan Owner.
 */
import bcrypt from "bcryptjs";
import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { outletMemberships, staffUsers, tvStaffPins } from "@/db/schema";
import { canHaveTvPin, validateTvPin } from "./staff-pin-rules";

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

/** Staf aktif outlet ini (akun utama atau keanggotaan multi-outlet) yang boleh punya PIN TV. */
export async function eligibleStaff(outletId: string) {
  const memberIds = (await db.select({ id: outletMemberships.staffUserId }).from(outletMemberships).where(eq(outletMemberships.outletId, outletId))).map((m) => m.id);
  const rows = await db
    .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role, isActive: staffUsers.isActive })
    .from(staffUsers)
    .where(memberIds.length ? or(eq(staffUsers.outletId, outletId), inArray(staffUsers.id, memberIds)) : eq(staffUsers.outletId, outletId));
  return rows.filter((r) => r.isActive && canHaveTvPin(r.role));
}

export async function listStaffPins(outletId: string): Promise<{ staffUserId: string; name: string; role: string; hasPin: boolean; updatedAt: string | null }[]> {
  const staff = await eligibleStaff(outletId);
  let pins: { staffUserId: string; updatedAt: string }[] = [];
  try {
    pins = await db.select({ staffUserId: tvStaffPins.staffUserId, updatedAt: tvStaffPins.updatedAt }).from(tvStaffPins).where(eq(tvStaffPins.outletId, outletId));
  } catch (err) {
    if (!isMissingTable(err)) throw err;
  }
  const byStaff = new Map(pins.map((p) => [p.staffUserId, p.updatedAt]));
  return staff
    .map((s) => ({ staffUserId: s.id, name: s.name, role: s.role, hasPin: byStaff.has(s.id), updatedAt: byStaff.get(s.id) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/** Simpan/ganti PIN staf. Menolak PIN lemah dan PIN yang sudah dipakai staf lain di outlet ini (supaya tidak ambigu). */
export async function setStaffPin(outletId: string, staffUserId: string, pin: string) {
  const invalid = validateTvPin(pin);
  if (invalid) throw new Error(invalid);
  const staff = await eligibleStaff(outletId);
  if (!staff.some((s) => s.id === staffUserId)) throw new Error("Staf tidak ditemukan atau perannya tidak boleh memakai PIN TV.");
  const others = await db.select().from(tvStaffPins).where(eq(tvStaffPins.outletId, outletId));
  for (const o of others) {
    if (o.staffUserId !== staffUserId && (await bcrypt.compare(pin, o.pinHash))) throw new Error("PIN ini sudah dipakai staf lain. Pilih PIN lain.");
  }
  const pinHash = await bcrypt.hash(pin, 10);
  const now = new Date().toISOString();
  await db
    .insert(tvStaffPins)
    .values({ outletId, staffUserId, pinHash })
    .onConflictDoUpdate({ target: [tvStaffPins.outletId, tvStaffPins.staffUserId], set: { pinHash, updatedAt: now } });
}

export async function removeStaffPin(outletId: string, staffUserId: string) {
  await db.delete(tvStaffPins).where(and(eq(tvStaffPins.outletId, outletId), eq(tvStaffPins.staffUserId, staffUserId)));
}

export async function hasAnyStaffPin(outletId: string): Promise<boolean> {
  try {
    const [row] = await db.select({ id: tvStaffPins.id }).from(tvStaffPins).where(eq(tvStaffPins.outletId, outletId)).limit(1);
    return !!row;
  } catch (err) {
    if (isMissingTable(err)) return false;
    throw err;
  }
}

/** Staf pemilik PIN ini di outlet ini (aktif & berperan sah), atau null. */
export async function matchStaffPin(outletId: string, pin: string): Promise<{ id: string; name: string } | null> {
  if (!/^\d{4,6}$/.test(pin ?? "")) return null;
  let rows: (typeof tvStaffPins.$inferSelect)[] = [];
  try {
    rows = await db.select().from(tvStaffPins).where(eq(tvStaffPins.outletId, outletId));
  } catch (err) {
    if (isMissingTable(err)) return null;
    throw err;
  }
  for (const r of rows) {
    if (await bcrypt.compare(pin, r.pinHash)) {
      const staff = (await eligibleStaff(outletId)).find((s) => s.id === r.staffUserId);
      return staff ? { id: staff.id, name: staff.name } : null;
    }
  }
  return null;
}

/** Staf yang dicatat untuk aksi dari TV: hanya bila staf itu sah di outlet ini DAN punya PIN TV. */
export async function validTvStaffIds(outletId: string, ids: string[]): Promise<Set<string>> {
  const want = [...new Set(ids.filter(Boolean))];
  if (want.length === 0) return new Set();
  let pins: { staffUserId: string }[] = [];
  try {
    pins = await db.select({ staffUserId: tvStaffPins.staffUserId }).from(tvStaffPins).where(and(eq(tvStaffPins.outletId, outletId), inArray(tvStaffPins.staffUserId, want)));
  } catch (err) {
    if (isMissingTable(err)) return new Set();
    throw err;
  }
  const eligible = new Set((await eligibleStaff(outletId)).map((s) => s.id));
  return new Set(pins.map((p) => p.staffUserId).filter((id) => eligible.has(id)));
}
