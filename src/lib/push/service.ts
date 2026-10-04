import webpush from "web-push";
import { db } from "@/db/client";
import { pushSubscriptions, staffUsers, outletMemberships, outlets } from "@/db/schema";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { effectiveCategories, renderPush, normalizeLang, isGoneStatus, MAX_PUSH_FAILURES, type PushCategory, type PushTemplate, type PushLang } from "./rules";

/**
 * Pengiriman notifikasi push (Web Push + VAPID). Di aplikasi NEXBILL Android (TWA dengan
 * enableNotifications) notifikasi ini tampil sebagai notifikasi aplikasi, meski aplikasi ditutup.
 *
 * Env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mis. "mailto:sales@nexbill.id").
 * Buat kunci sekali dengan: node scripts/generate-vapid-keys.mjs
 *
 * SEMUA fungsi notify* tidak pernah melempar error — notifikasi gagal tidak boleh menggagalkan
 * transaksi, booking, atau tutup shift. Kirim paralel dengan batas waktu supaya request tidak lama.
 */

let configured: boolean | null = null;
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    configured = false;
    return false;
  }
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:sales@nexbill.id", pub, priv);
    configured = true;
  } catch (err) {
    console.error("[push] VAPID tidak valid:", err);
    configured = false;
  }
  return configured;
}

export function getPushPublicKey(): string | null {
  return ensureConfigured() ? process.env.VAPID_PUBLIC_KEY ?? null : null;
}

export interface PushPayload {
  title: string;
  body: string;
  /** Halaman yang dibuka saat notifikasi diketuk. */
  url?: string;
  /** Notifikasi dengan tag sama saling menggantikan (mis. per sesi). */
  tag?: string;
}

type SubRow = typeof pushSubscriptions.$inferSelect;

async function deliver(sub: SubRow, payload: PushPayload): Promise<boolean> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify({ ...payload, icon: "/icons/icon-192.png", badge: "/icons/badge-96.png" }),
      { TTL: 60 * 30, urgency: "high" }
    );
    await db.update(pushSubscriptions).set({ failureCount: 0, lastSuccessAt: new Date().toISOString() }).where(eq(pushSubscriptions.id, sub.id));
    return true;
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (isGoneStatus(status) || sub.failureCount + 1 >= MAX_PUSH_FAILURES) {
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
    } else {
      await db.update(pushSubscriptions).set({ failureCount: sub.failureCount + 1 }).where(eq(pushSubscriptions.id, sub.id));
    }
    if (!isGoneStatus(status)) console.warn("[push] gagal kirim:", status ?? (err as Error)?.message);
    return false;
  }
}

async function deliverAll(subs: SubRow[], payload: PushPayload, timeoutMs = 6000): Promise<number> {
  if (!subs.length) return 0;
  let ok = 0;
  const all = Promise.allSettled(subs.map((s) => deliver(s, payload).then((r) => (r ? ok++ : 0))));
  await Promise.race([all, new Promise((r) => setTimeout(r, timeoutMs))]);
  return ok;
}

/** Penerima untuk satu outlet: staf aktif yang punya akses outlet itu dan memilih kategori ini. */
async function recipientsFor(outletId: string, category: PushCategory, onlyStaffIds?: string[]) {
  const memberIds = (await db.select({ id: outletMemberships.staffUserId }).from(outletMemberships).where(eq(outletMemberships.outletId, outletId))).map((m) => m.id);
  const staff = await db
    .select({ id: staffUsers.id, role: staffUsers.role, prefs: staffUsers.pushCategoriesJson })
    .from(staffUsers)
    .where(and(eq(staffUsers.isActive, true), memberIds.length ? or(eq(staffUsers.outletId, outletId), inArray(staffUsers.id, memberIds)) : eq(staffUsers.outletId, outletId)));
  return staff.filter((s) => (!onlyStaffIds || onlyStaffIds.includes(s.id)) && effectiveCategories(s.role, s.prefs).includes(category)).map((s) => s.id);
}

async function outletLang(outletId: string): Promise<PushLang> {
  const [o] = await db.select({ lang: outlets.preferredLang }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return normalizeLang(o?.lang);
}

/**
 * Kirim notifikasi ke semua staf outlet yang memilih kategori ini. Teks dibuat dari template
 * sesuai bahasa outlet. Tidak pernah melempar.
 */
export async function notifyOutlet(
  outletId: string,
  category: PushCategory,
  template: PushTemplate,
  vars: Record<string, string | number>,
  opts: { url?: string; tag?: string; onlyStaffIds?: string[] } = {}
): Promise<number> {
  try {
    if (!ensureConfigured()) return 0;
    const staffIds = await recipientsFor(outletId, category, opts.onlyStaffIds);
    if (!staffIds.length) return 0;
    const subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.staffUserId, staffIds));
    if (!subs.length) return 0;
    const lang = await outletLang(outletId);
    const { title, body } = renderPush(template, lang, vars);
    return await deliverAll(subs, { title, body, url: opts.url ?? "/dashboard", tag: opts.tag });
  } catch (err) {
    console.error("[push] notifyOutlet gagal:", err);
    return 0;
  }
}

/** Notifikasi uji ke semua perangkat milik satu pengguna. */
export async function sendTestPush(staffUserId: string, outletId: string): Promise<number> {
  if (!ensureConfigured()) throw new Error("Notifikasi push belum dikonfigurasi di server (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).");
  const subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.staffUserId, staffUserId));
  const { title, body } = renderPush("test", await outletLang(outletId));
  return deliverAll(subs, { title, body, url: "/dashboard", tag: "nexbill-test" });
}

export async function saveSubscription(input: {
  staffUserId: string;
  outletId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  isAndroidApp?: boolean;
}) {
  if (!/^https:\/\//.test(input.endpoint) || input.endpoint.length > 1000) throw new Error("Endpoint push tidak valid.");
  if (!input.p256dh || !input.auth || input.p256dh.length > 200 || input.auth.length > 100) throw new Error("Kunci push tidak valid.");
  const now = new Date().toISOString();
  await db
    .insert(pushSubscriptions)
    .values({ ...input, userAgent: input.userAgent?.slice(0, 300) ?? null, isAndroidApp: !!input.isAndroidApp, failureCount: 0 })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        staffUserId: input.staffUserId,
        outletId: input.outletId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent?.slice(0, 300) ?? null,
        isAndroidApp: !!input.isAndroidApp,
        failureCount: 0,
        updatedAt: now,
      },
    });
}

export async function removeSubscription(staffUserId: string, endpoint: string) {
  await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.staffUserId, staffUserId), eq(pushSubscriptions.endpoint, endpoint)));
}

export async function countSubscriptions(staffUserId: string): Promise<number> {
  const [r] = (await db.select({ n: sql<number>`count(*)` }).from(pushSubscriptions).where(eq(pushSubscriptions.staffUserId, staffUserId))) as { n: number }[];
  return Number(r?.n ?? 0);
}

/** Hapus semua langganan push milik akun-akun ini (dipakai saat penghapusan akun). */
export async function removeAllSubscriptionsFor(staffUserIds: string[]) {
  if (staffUserIds.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.staffUserId, staffUserIds));
}
