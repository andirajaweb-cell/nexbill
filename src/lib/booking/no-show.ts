import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { bookingBlacklist, bookingNoShowPolicies, bookings } from "@/db/schema";
import { DEFAULT_NO_SHOW_POLICY, evaluateBlock, normalizePhone, sanitizePolicy, type BlacklistEntry, type BlockVerdict, type NoShowPolicy } from "./no-show-core";

/**
 * Blacklist no-show booking PS — bagian database. Aturannya di no-show-core.ts.
 * Tabel dari migrasi 0036; sebelum migrasi dijalankan fitur ini MATI (tidak memblokir siapa pun),
 * karena tanpa tabelnya pemilik juga tidak bisa melepas blokir.
 */

function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string }; message?: string };
  return e?.code === "42P01" || e?.cause?.code === "42P01" || /booking_no_show_policies|booking_blacklist/i.test(e?.message ?? "");
}

export async function getNoShowPolicy(outletId: string): Promise<NoShowPolicy & { migrationMissing?: boolean }> {
  try {
    const [row] = await db.select().from(bookingNoShowPolicies).where(eq(bookingNoShowPolicies.outletId, outletId)).limit(1);
    return row ? sanitizePolicy(row) : { ...DEFAULT_NO_SHOW_POLICY };
  } catch (err) {
    if (isMissingTable(err)) return { ...DEFAULT_NO_SHOW_POLICY, enabled: false, migrationMissing: true };
    throw err;
  }
}

export async function saveNoShowPolicy(outletId: string, input: Partial<NoShowPolicy>, staffUserId: string) {
  const p = sanitizePolicy(input);
  const now = new Date().toISOString();
  await db
    .insert(bookingNoShowPolicies)
    .values({ outletId, ...p, updatedBy: staffUserId, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: bookingNoShowPolicies.outletId, set: { ...p, updatedBy: staffUserId, updatedAt: now } });
  return p;
}

/** No-show outlet ini sejak `sinceIso`, dikelompokkan per nomor yang sudah dinormalkan. */
async function noShowsByPhone(outletId: string, sinceIso: string) {
  const rows = await db
    .select({ phone: bookings.phone, name: bookings.customerName, noShowAt: bookings.noShowAt, scheduledStart: bookings.scheduledStart, bookingCode: bookings.bookingCode })
    .from(bookings)
    .where(and(eq(bookings.outletId, outletId), eq(bookings.status, "no_show"), gte(bookings.scheduledStart, sinceIso)));
  const map = new Map<string, { names: Set<string>; ats: string[]; codes: string[] }>();
  for (const r of rows) {
    const phone = normalizePhone(r.phone);
    if (!phone) continue;
    const g = map.get(phone) ?? { names: new Set<string>(), ats: [], codes: [] };
    if (r.name) g.names.add(r.name);
    g.ats.push(r.noShowAt ?? r.scheduledStart);
    if (r.bookingCode) g.codes.push(r.bookingCode);
    map.set(phone, g);
  }
  return map;
}

async function entriesFor(outletId: string, phone?: string): Promise<(BlacklistEntry & { phone: string; id: string })[]> {
  const where = phone ? and(eq(bookingBlacklist.outletId, outletId), eq(bookingBlacklist.phone, phone)) : eq(bookingBlacklist.outletId, outletId);
  const rows = await db.select().from(bookingBlacklist).where(where);
  return rows.map((r) => ({ id: r.id, phone: r.phone, kind: r.kind, createdAt: r.createdAt, liftedAt: r.liftedAt, reason: r.reason }));
}

/** Apakah nomor ini sedang diblokir untuk booking di outlet ini. */
export async function checkBookingBlock(outletId: string, rawPhone: string): Promise<BlockVerdict & { phone: string }> {
  const phone = normalizePhone(rawPhone);
  const none = { blocked: false, source: null, countedNoShows: 0, reason: null, phone };
  if (!phone) return none;
  try {
    const policy = await getNoShowPolicy(outletId);
    if (policy.migrationMissing) return none;
    const since = new Date(Date.now() - policy.windowDays * 86400000).toISOString();
    const [groups, entries] = await Promise.all([noShowsByPhone(outletId, since), entriesFor(outletId, phone)]);
    return { ...evaluateBlock(groups.get(phone)?.ats ?? [], entries, policy, Date.now()), phone };
  } catch (err) {
    if (isMissingTable(err)) return none;
    throw err;
  }
}

export interface NoShowListRow {
  phone: string;
  names: string[];
  noShows: number;
  lastNoShowAt: string | null;
  bookingCodes: string[];
  verdict: BlockVerdict;
}

/** Daftar untuk dashboard: semua nomor yang pernah no-show dalam jendela + yang diblokir manual. */
export async function listNoShowOffenders(outletId: string): Promise<{ policy: NoShowPolicy & { migrationMissing?: boolean }; rows: NoShowListRow[] }> {
  const policy = await getNoShowPolicy(outletId);
  const since = new Date(Date.now() - policy.windowDays * 86400000).toISOString();
  const groups = await noShowsByPhone(outletId, since);
  let entries: Awaited<ReturnType<typeof entriesFor>> = [];
  if (!policy.migrationMissing) {
    try {
      entries = await entriesFor(outletId);
    } catch (err) {
      if (!isMissingTable(err)) throw err;
    }
  }
  const phones = new Set<string>([...groups.keys(), ...entries.filter((e) => e.kind === "block" && !e.liftedAt).map((e) => e.phone)]);
  const now = Date.now();
  const rows: NoShowListRow[] = [...phones].map((phone) => {
    const g = groups.get(phone);
    const mine = entries.filter((e) => e.phone === phone);
    const ats = g?.ats ?? [];
    return {
      phone,
      names: [...(g?.names ?? [])],
      noShows: ats.length,
      lastNoShowAt: ats.length ? ats.reduce((a, b) => (a > b ? a : b)) : null,
      bookingCodes: (g?.codes ?? []).slice(-5),
      verdict: evaluateBlock(ats, mine, policy.migrationMissing ? { ...policy, enabled: false } : policy, now),
    };
  });
  rows.sort((a, b) => Number(b.verdict.blocked) - Number(a.verdict.blocked) || b.verdict.countedNoShows - a.verdict.countedNoShows || (b.lastNoShowAt ?? "").localeCompare(a.lastNoShowAt ?? ""));
  return { policy, rows };
}

export async function blockPhone(outletId: string, rawPhone: string, reason: string | null, staffUserId: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error("Nomor WhatsApp tidak valid.");
  const active = await db
    .select({ id: bookingBlacklist.id })
    .from(bookingBlacklist)
    .where(and(eq(bookingBlacklist.outletId, outletId), eq(bookingBlacklist.phone, phone), eq(bookingBlacklist.kind, "block"), isNull(bookingBlacklist.liftedAt)))
    .limit(1);
  if (active.length) return { phone, alreadyBlocked: true };
  await db.insert(bookingBlacklist).values({ outletId, phone, kind: "block", reason: reason?.trim().slice(0, 200) || null, createdBy: staffUserId });
  return { phone, alreadyBlocked: false };
}

/** Lepas blokir: tutup blokir manual + catat pengampunan supaya no-show lama tidak memblokir lagi. */
export async function liftBlock(outletId: string, rawPhone: string, staffUserId: string) {
  const phone = normalizePhone(rawPhone);
  if (!phone) throw new Error("Nomor WhatsApp tidak valid.");
  const now = new Date().toISOString();
  await db
    .update(bookingBlacklist)
    .set({ liftedAt: now, liftedBy: staffUserId })
    .where(and(eq(bookingBlacklist.outletId, outletId), eq(bookingBlacklist.phone, phone), eq(bookingBlacklist.kind, "block"), isNull(bookingBlacklist.liftedAt)));
  await db.insert(bookingBlacklist).values({ outletId, phone, kind: "forgive", reason: "Blokir dilepas", createdBy: staffUserId, createdAt: now });
  return { phone };
}

/** Pesan untuk pelanggan di halaman booking online — sopan, tanpa menyebut jumlah pastinya. */
export const ONLINE_BLOCK_MESSAGE =
  "Nomor ini belum bisa booking online karena beberapa booking sebelumnya tidak datang (no-show). Silakan hubungi outlet lewat WhatsApp untuk booking.";
