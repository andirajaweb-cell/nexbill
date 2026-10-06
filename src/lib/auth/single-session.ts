import { db } from "@/db/client";
import { outlets, staffUsers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { isDemoEmail } from "./demo-account";

/**
 * Satu akun = satu perangkat/browser aktif.
 *
 * Setiap login membuat id sesi (sid) yang disimpan di staff_users.active_session_id dan ikut di dalam
 * JWT. getSession() hanya menerima token yang sid-nya masih sama dengan yang tersimpan, jadi:
 *  - Login dari browser/PC lain DITOLAK selama sesi yang ada masih aktif (ada aktivitas dalam
 *    IDLE_MINUTES terakhir). Pesannya menyebut perangkat & kapan terakhir aktif.
 *  - Sesi dianggap berakhir setelah IDLE_MINUTES tanpa aktivitas — supaya pemilik akun tidak terkunci
 *    berhari-hari hanya karena browsernya tertutup atau cookie-nya terhapus.
 *  - Logout, atau Owner/Manager menekan "Keluarkan" di Staf & Hak Akses, langsung membebaskannya.
 *  - Superuser (sesi impersonasi tim NEXBILL) tidak terkena aturan ini.
 *  - Aturan bisa dimatikan per outlet (outlets.single_device_login) untuk outlet yang memang
 *    memakai satu akun di beberapa perangkat (mis. kasir + tablet dapur).
 */

export const IDLE_MINUTES = 30;
const HEARTBEAT_MS = 60_000;
const CACHE_MS = 15_000;

export class SessionConflictError extends Error {
  constructor(public device: string | null, public lastSeen: string | null) {
    const where = [device, lastSeen ? `aktif ${minutesAgo(lastSeen)}` : null].filter(Boolean).join(", ");
    super(
      `Akun ini sedang aktif di perangkat lain${where ? ` (${where})` : ""}. ` +
        `Demi keamanan, satu akun hanya bisa dipakai di satu browser. Keluar (logout) dulu dari perangkat itu, ` +
        `minta Owner/Manager mengeluarkannya di Staf & Hak Akses, atau coba lagi setelah ${IDLE_MINUTES} menit perangkat itu tidak dipakai.`
    );
  }
}

function minutesAgo(iso: string): string {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 1 ? "baru saja" : `${m} menit lalu`;
}

/** "Chrome · Windows" dari User-Agent — hanya untuk ditampilkan, tidak dipakai untuk keputusan keamanan. */
export function describeDevice(ua: string | null | undefined): string {
  if (!ua) return "Perangkat tidak dikenal";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

export function isSessionFresh(lastSeen: string | null | undefined, now = Date.now()): boolean {
  if (!lastSeen) return false;
  return now - new Date(lastSeen).getTime() < IDLE_MINUTES * 60_000;
}

async function singleDeviceEnforced(outletId: string): Promise<boolean> {
  const [o] = await db.select({ on: outlets.singleDeviceLogin }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return o?.on !== false;
}

/**
 * Dipanggil setelah kredensial terbukti benar (login password/Google, pendaftaran). Mengembalikan sid
 * baru untuk dimasukkan ke JWT, atau melempar SessionConflictError bila akun sedang aktif di
 * perangkat lain. `currentSid` = sid dari cookie browser INI (login ulang di browser yang sama boleh).
 */
export async function claimSession(
  user: { id: string; outletId: string; role: string },
  ctx: { userAgent?: string | null; ip?: string | null; currentSid?: string | null }
): Promise<string> {
  const sid = crypto.randomUUID();
  const now = new Date().toISOString();
  const [row] = await db
    .select({ sid: staffUsers.activeSessionId, at: staffUsers.activeSessionAt, device: staffUsers.activeSessionDevice, email: staffUsers.email })
    .from(staffUsers)
    .where(eq(staffUsers.id, user.id))
    .limit(1);
  // Akun demo publik (lib/auth/demo-account.ts): banyak pengunjung login bersamaan. Semua memakai
  // sid yang sama, jadi login baru tidak menggugurkan sesi pengunjung lain dan tidak ada penolakan.
  if (isDemoEmail(row?.email)) {
    const shared = row?.sid ?? sid;
    await db
      .update(staffUsers)
      .set({ activeSessionId: shared, activeSessionAt: now, activeSessionDevice: "Akun demo (banyak perangkat)", activeSessionIp: null })
      .where(eq(staffUsers.id, user.id));
    cache.delete(user.id);
    return shared;
  }
  if (
    user.role !== "superuser" &&
    row?.sid &&
    row.sid !== ctx.currentSid &&
    isSessionFresh(row.at) &&
    (await singleDeviceEnforced(user.outletId))
  ) {
    throw new SessionConflictError(row.device ?? null, row.at ?? null);
  }
  await db
    .update(staffUsers)
    .set({ activeSessionId: sid, activeSessionAt: now, activeSessionDevice: describeDevice(ctx.userAgent), activeSessionIp: ctx.ip ?? null })
    .where(eq(staffUsers.id, user.id));
  cache.delete(user.id);
  return sid;
}

/** Logout: bebaskan akun hanya bila sid yang keluar memang sesi yang berlaku. */
export async function releaseSession(userId: string, sid: string | undefined) {
  if (!sid) return;
  // Logout satu pengunjung akun demo tidak boleh mengeluarkan pengunjung lain (sid dipakai bersama).
  const [u] = await db.select({ email: staffUsers.email }).from(staffUsers).where(eq(staffUsers.id, userId)).limit(1);
  if (isDemoEmail(u?.email)) return;
  await db
    .update(staffUsers)
    .set({ activeSessionId: null, activeSessionAt: null, activeSessionDevice: null, activeSessionIp: null })
    .where(and(eq(staffUsers.id, userId), eq(staffUsers.activeSessionId, sid)));
  cache.delete(userId);
}

/** Owner/Manager: keluarkan akun staf dari perangkat mana pun (sesi lama langsung tidak berlaku). */
export async function revokeSession(userId: string) {
  await db
    .update(staffUsers)
    .set({ activeSessionId: null, activeSessionAt: null, activeSessionDevice: null, activeSessionIp: null })
    .where(eq(staffUsers.id, userId));
  cache.delete(userId);
}

// Per-instance cache so one request calling getSession() several times — and a busy POS polling
// every few seconds — doesn't hit the database each time. Revocation takes effect within CACHE_MS.
const cache = new Map<string, { sid: string | null; isActive: boolean; checkedAt: number; lastBeat: number }>();

/**
 * Apakah token ini masih sesi yang berlaku? Token lama (dibuat sebelum aturan ini, tanpa sid) tetap
 * diterima selama akun belum pernah login dengan aturan baru; begitu akun login ulang, token lama
 * itu otomatis gugur. Juga memperbarui "terakhir aktif" paling sering sekali per menit.
 */
export async function isSessionCurrent(payload: { sub: string; role: string; sid?: string }): Promise<boolean> {
  if (payload.role === "superuser") return true;
  const nowMs = Date.now();
  let entry = cache.get(payload.sub);
  if (!entry || nowMs - entry.checkedAt > CACHE_MS) {
    const [row] = await db
      .select({ sid: staffUsers.activeSessionId, isActive: staffUsers.isActive })
      .from(staffUsers)
      .where(eq(staffUsers.id, payload.sub))
      .limit(1);
    if (!row) return false;
    entry = { sid: row.sid, isActive: row.isActive, checkedAt: nowMs, lastBeat: entry?.lastBeat ?? 0 };
    cache.set(payload.sub, entry);
  }
  if (!entry.isActive) return false;
  const ok = payload.sid ? entry.sid === payload.sid : entry.sid === null;
  if (ok && payload.sid && nowMs - entry.lastBeat > HEARTBEAT_MS) {
    entry.lastBeat = nowMs;
    await db
      .update(staffUsers)
      .set({ activeSessionAt: new Date(nowMs).toISOString() })
      .where(and(eq(staffUsers.id, payload.sub), eq(staffUsers.activeSessionId, payload.sid)));
  }
  return ok;
}
