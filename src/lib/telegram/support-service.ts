/**
 * Operasi DB bot Telegram support: tautan akun, log percakapan, tiket Chat Bantuan, status akun
 * merchant (hanya baca), dan notifikasi petugas jaga untuk P1. Semua query dibatasi outletId dari
 * tautan chat — bot tidak pernah membaca data outlet lain.
 */
import { randomBytes } from "crypto";
import { and, count, desc, eq, gte, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import {
  offlineSyncActions,
  outlets,
  rentalUnits,
  subscriptions,
  supportMessages,
  supportThreads,
  telegramSupportLinks,
  telegramSupportMessages,
  tvScreens,
} from "@/db/schema";
import { getPlanById } from "@/lib/subscription/plan-catalog";
import { sendTelegramText } from "./api";
import { type ChatTurn, CONTEXT_MESSAGES, CONVERSATION_GAP_MS, LINK_CODE_TTL_MS, makeLinkCode, ticketSubject, type SupportPriority } from "./support-rules";

export const DASHBOARD_URL = (process.env.NEXT_PUBLIC_DASHBOARD_URL || "https://dashboard.nexbill.id").replace(/\/$/, "");

export type TelegramLink = typeof telegramSupportLinks.$inferSelect;

/** Postgres 42P01 = tabel belum ada (migrasi 0037 belum dijalankan). */
export function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

/* ------------------------------------------------------------------ tautan ------------------------------------------------------------------ */

export async function getLinkForStaff(staffUserId: string, outletId: string): Promise<TelegramLink | null> {
  const [row] = await db
    .select()
    .from(telegramSupportLinks)
    .where(and(eq(telegramSupportLinks.staffUserId, staffUserId), eq(telegramSupportLinks.outletId, outletId)))
    .limit(1);
  return row ?? null;
}

/** Buat (atau ganti) kode tautan sekali pakai untuk staf ini di outlet ini. */
export async function createLinkCode(staffUserId: string, outletId: string, staffName: string): Promise<string> {
  const code = makeLinkCode(randomBytes(24));
  const now = new Date();
  const expires = new Date(now.getTime() + LINK_CODE_TTL_MS).toISOString();
  await db
    .insert(telegramSupportLinks)
    .values({ outletId, staffUserId, staffName, linkCode: code, linkCodeExpiresAt: expires })
    .onConflictDoUpdate({
      target: [telegramSupportLinks.staffUserId, telegramSupportLinks.outletId],
      set: { linkCode: code, linkCodeExpiresAt: expires, staffName, updatedAt: now.toISOString() },
    });
  return code;
}

/** Pakai kode dari /start: chat ini ditautkan ke staf+outlet pemilik kode (tautan lama chat ini dilepas). */
export async function redeemLinkCode(code: string, chatId: string, username: string | null): Promise<TelegramLink | null> {
  const nowIso = new Date().toISOString();
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(telegramSupportLinks).where(eq(telegramSupportLinks.linkCode, code)).limit(1);
    if (!row || !row.linkCodeExpiresAt || row.linkCodeExpiresAt < nowIso) return null;
    await tx
      .update(telegramSupportLinks)
      .set({ chatId: null, updatedAt: nowIso })
      .where(and(eq(telegramSupportLinks.chatId, chatId), ne(telegramSupportLinks.id, row.id)));
    const [linked] = await tx
      .update(telegramSupportLinks)
      .set({ chatId, telegramUsername: username, linkCode: null, linkCodeExpiresAt: null, linkedAt: nowIso, updatedAt: nowIso })
      .where(eq(telegramSupportLinks.id, row.id))
      .returning();
    return linked ?? null;
  });
}

export async function getLinkByChat(chatId: string): Promise<TelegramLink | null> {
  const [row] = await db.select().from(telegramSupportLinks).where(eq(telegramSupportLinks.chatId, chatId)).limit(1);
  return row ?? null;
}

export async function unlinkChat(chatId: string) {
  await db
    .update(telegramSupportLinks)
    .set({ chatId: null, telegramUsername: null, linkedAt: null, updatedAt: new Date().toISOString() })
    .where(eq(telegramSupportLinks.chatId, chatId));
}

export async function unlinkStaff(staffUserId: string, outletId: string): Promise<string | null> {
  const link = await getLinkForStaff(staffUserId, outletId);
  if (!link) return null;
  await db
    .update(telegramSupportLinks)
    .set({ chatId: null, telegramUsername: null, linkedAt: null, linkCode: null, linkCodeExpiresAt: null, updatedAt: new Date().toISOString() })
    .where(eq(telegramSupportLinks.id, link.id));
  return link.chatId;
}

export async function outletName(outletId: string): Promise<string> {
  const [o] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return o?.name ?? "Outlet";
}

export async function outletLang(outletId: string): Promise<string> {
  const [o] = await db.select({ lang: outlets.preferredLang }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return o?.lang ?? "id";
}

/* ------------------------------------------------------------------ log ------------------------------------------------------------------ */

type LogInsert = typeof telegramSupportMessages.$inferInsert;

/** Catat pesan masuk. Mengembalikan false bila update_id ini sudah pernah diproses (Telegram mengirim ulang). */
export async function logUserMessage(row: Omit<LogInsert, "role">): Promise<boolean> {
  const inserted = await db
    .insert(telegramSupportMessages)
    .values({ ...row, role: "user" })
    .onConflictDoNothing({ target: telegramSupportMessages.updateId })
    .returning({ id: telegramSupportMessages.id });
  return inserted.length > 0;
}

/** Catat pesan; mengembalikan id baris (dipakai tombol penilaian di Telegram). */
export async function logMessage(row: LogInsert): Promise<string | null> {
  const [r] = await db.insert(telegramSupportMessages).values(row).returning({ id: telegramSupportMessages.id });
  return r?.id ?? null;
}

/** Pesan bot milik chat ini (untuk tombol penilaian) — dibatasi chatId supaya tombol chat lain tidak bisa dipakai. */
export async function botLogForChat(chatId: string, logId: string) {
  const [row] = await db
    .select()
    .from(telegramSupportMessages)
    .where(and(eq(telegramSupportMessages.id, logId), eq(telegramSupportMessages.chatId, chatId), eq(telegramSupportMessages.role, "bot")))
    .limit(1);
  return row ?? null;
}

/** Baris log khusus untuk error bot (tanpa migrasi): chat "_sistem", tampil di Platform Admin › Telegram Bot. */
export const SYSTEM_CHAT = "_sistem";

export async function recordBotError(where: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`Bot Telegram (${where}):`, err);
  await db
    .insert(telegramSupportMessages)
    .values({ chatId: SYSTEM_CHAT, role: "bot", body: `[${where}] ${msg}`.slice(0, 1000) })
    .catch(() => undefined);
}

export async function recentBotErrors(limit = 5) {
  return db
    .select({ body: telegramSupportMessages.body, createdAt: telegramSupportMessages.createdAt })
    .from(telegramSupportMessages)
    .where(eq(telegramSupportMessages.chatId, SYSTEM_CHAT))
    .orderBy(desc(telegramSupportMessages.createdAt))
    .limit(limit);
}

/** Jumlah pesan merchant di chat ini dalam N menit terakhir (rem banjir pesan). */
export async function userMessagesSince(chatId: string, minutes: number): Promise<number> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const [r] = await db
    .select({ n: count() })
    .from(telegramSupportMessages)
    .where(and(eq(telegramSupportMessages.chatId, chatId), eq(telegramSupportMessages.role, "user"), gte(telegramSupportMessages.createdAt, since)));
  return r?.n ?? 0;
}

export async function touchLink(chatId: string) {
  await db.update(telegramSupportLinks).set({ lastMessageAt: new Date().toISOString() }).where(eq(telegramSupportLinks.chatId, chatId));
}

export type ContextTurn = ChatTurn;

/** Riwayat percakapan yang sedang berjalan (berhenti di jeda > 6 jam), lama → baru. */
export async function recentConversation(chatId: string): Promise<ContextTurn[]> {
  const rows = await db
    .select({ role: telegramSupportMessages.role, body: telegramSupportMessages.body, createdAt: telegramSupportMessages.createdAt, resolution: telegramSupportMessages.resolution })
    .from(telegramSupportMessages)
    .where(eq(telegramSupportMessages.chatId, chatId))
    .orderBy(desc(telegramSupportMessages.createdAt))
    .limit(CONTEXT_MESSAGES);
  const out: ContextTurn[] = [];
  let prev: number | null = null;
  for (const r of rows) {
    const at = new Date(r.createdAt).getTime();
    if (prev !== null && prev - at > CONVERSATION_GAP_MS) break;
    out.push(r);
    prev = at;
  }
  return out.reverse();
}

/** Chat Telegram asal sebuah tiket (bila tiket itu dibuat lewat bot). */
export async function telegramChatForThread(threadId: string): Promise<{ chatId: string; outletId: string | null } | null> {
  const [row] = await db
    .select({ chatId: telegramSupportMessages.chatId, outletId: telegramSupportMessages.outletId })
    .from(telegramSupportMessages)
    .where(eq(telegramSupportMessages.supportThreadId, threadId))
    .orderBy(desc(telegramSupportMessages.createdAt))
    .limit(1);
  return row ?? null;
}

/** Tiket yang terkait pesan tim tertentu di Telegram (merchant membalas pesan itu → masuk ke tiketnya). */
export async function threadForTelegramMessage(chatId: string, tgMessageId: string): Promise<string | null> {
  const [row] = await db
    .select({ threadId: telegramSupportMessages.supportThreadId })
    .from(telegramSupportMessages)
    .where(and(eq(telegramSupportMessages.chatId, chatId), eq(telegramSupportMessages.tgMessageId, tgMessageId), isNotNull(telegramSupportMessages.supportThreadId)))
    .limit(1);
  return row?.threadId ?? null;
}

/* ------------------------------------------------------------------ tiket ------------------------------------------------------------------ */

export type TicketCategory = "keluhan" | "saran" | "kendala_teknis" | "lainnya";

export interface TicketInput {
  link: TelegramLink;
  priority: SupportPriority;
  category: TicketCategory;
  summary: string;
  tried?: string;
  accountStatus?: string;
}

export async function createSupportTicket(input: TicketInput): Promise<{ threadId: string }> {
  const now = new Date().toISOString();
  const who = `${input.link.staffName ?? "Staf"} (via Telegram${input.link.telegramUsername ? ` @${input.link.telegramUsername}` : ""})`;
  const body = [
    `Diteruskan dari chat Telegram — prioritas ${input.priority}.`,
    `Masalah: ${input.summary.trim()}`,
    input.tried?.trim() ? `Sudah dicoba: ${input.tried.trim()}` : null,
    input.accountStatus?.trim() ? `Status akun saat itu: ${input.accountStatus.trim()}` : null,
    "Balasan tim di tiket ini otomatis diteruskan ke Telegram merchant.",
  ]
    .filter(Boolean)
    .join("\n");
  const [thread] = await db
    .insert(supportThreads)
    .values({ outletId: input.link.outletId, subject: ticketSubject(input.summary, input.priority), category: input.category, lastMessageAt: now })
    .returning({ id: supportThreads.id });
  await db.insert(supportMessages).values({ threadId: thread.id, sender: "outlet", senderName: who, body });
  return { threadId: thread.id };
}

/** Pesan merchant dari Telegram yang membalas pesan tim → ditambahkan ke tiket yang sama. */
export async function appendToTicket(threadId: string, link: TelegramLink, text: string) {
  const now = new Date().toISOString();
  await db.insert(supportMessages).values({
    threadId,
    sender: "outlet",
    senderName: `${link.staffName ?? "Staf"} (via Telegram)`,
    body: text,
  });
  await db.update(supportThreads).set({ lastMessageAt: now, status: "open" }).where(and(eq(supportThreads.id, threadId), eq(supportThreads.outletId, link.outletId)));
}

/** Notifikasi P1 ke petugas jaga: env TELEGRAM_ONCALL_CHAT_IDS (chat id dipisah koma; kirim /id ke bot untuk melihatnya). */
export async function notifyOnCall(text: string): Promise<number> {
  const ids = (process.env.TELEGRAM_ONCALL_CHAT_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  let sent = 0;
  for (const id of ids) {
    try {
      await sendTelegramText(id, text);
      sent++;
    } catch (err) {
      console.error("Gagal mengirim notifikasi petugas jaga Telegram:", err);
    }
  }
  return sent;
}

/* ------------------------------------------------------------------ status akun (hanya baca) ------------------------------------------------------------------ */

export async function accountStatus(outletId: string) {
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const [outlet] = await db.select({ name: outlets.name, isActive: outlets.isActive }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.outletId, outletId)).limit(1);
  const plan = sub?.planId ? await getPlanById(sub.planId) : null;
  const [units] = await db.select({ n: count() }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  const screens = await db
    .select({ name: tvScreens.name, isActive: tvScreens.isActive, pairedAt: tvScreens.pairedAt, lastSeenAt: tvScreens.lastSeenAt })
    .from(tvScreens)
    .where(eq(tvScreens.outletId, outletId));
  const [failedSync] = await db
    .select({ n: count() })
    .from(offlineSyncActions)
    .where(and(eq(offlineSyncActions.outletId, outletId), eq(offlineSyncActions.status, "failed"), gte(offlineSyncActions.createdAt, weekAgo)));
  const [openTickets] = await db
    .select({ n: count() })
    .from(supportThreads)
    .where(and(eq(supportThreads.outletId, outletId), eq(supportThreads.status, "open")));
  const now = Date.now();
  return {
    outlet: outlet?.name ?? null,
    outletActive: outlet?.isActive ?? null,
    subscription: sub
      ? {
          status: sub.status,
          plan: plan?.name ?? null,
          trialEndsAt: sub.status === "trial" || sub.status === "trial_expired" ? sub.trialEndsAt : null,
          periodEnd: sub.currentPeriodEnd,
          graceUntil: sub.graceUntil,
        }
      : null,
    activeRentalUnits: units?.n ?? 0,
    tvScreens: screens.map((s) => ({
      name: s.name,
      active: s.isActive,
      paired: !!s.pairedAt,
      lastSeenMinutesAgo: s.lastSeenAt ? Math.round((now - new Date(s.lastSeenAt).getTime()) / 60_000) : null,
    })),
    failedOfflineActionsLast7Days: failedSync?.n ?? 0,
    openSupportTickets: openTickets?.n ?? 0,
  };
}

/** Ringkasan status akun satu baris untuk badan tiket. */
export function statusLine(s: Awaited<ReturnType<typeof accountStatus>>): string {
  const sub = s.subscription ? `${s.subscription.status}${s.subscription.plan ? ` (${s.subscription.plan})` : ""}` : "tanpa langganan";
  const offline = s.tvScreens.filter((t) => t.active && (t.lastSeenMinutesAgo == null || t.lastSeenMinutesAgo > 10)).length;
  return `langganan ${sub}; ${s.activeRentalUnits} unit aktif; ${s.tvScreens.length} layar TV (${offline} tidak terlihat >10 mnt); ${s.failedOfflineActionsLast7Days} aksi offline gagal 7 hari; ${s.openSupportTickets} tiket terbuka`;
}
