/**
 * Operasi DB support WhatsApp. Tanpa migrasi baru:
 *  - Tautan nomor ↔ staf: baris log telegram_support_messages chat_id "wa-link:<628…>" (outlet_id =
 *    outlet staf, body = JSON {staffUserId, staffName}) — dibuat saat merchant mengirim kode dari
 *    dashboard (membuktikan nomor itu miliknya). Satu nomor bisa tertaut ke beberapa outlet.
 *  - Tanpa tautan: nomor WhatsApp = nomor HP di Profil Outlet → dikenali sebagai Owner outlet itu.
 *  - Log percakapan: chat_id "wa:<628…>" (metrik, konteks AI, tiket asal WhatsApp, balasan tim yang
 *    menunggu dikirim bot: role "team" + tg_message_id kosong).
 *  - Kode tautan sekali pakai: chat_id "wa-code:<KODE>" (body = JSON staf), berlaku 15 menit.
 * Semua query dibatasi outlet staf yang dikenali — bot tidak pernah membaca data outlet lain.
 */
import { randomBytes } from "crypto";
import { and, asc, desc, eq, gte, inArray, isNull, like, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, staffUsers, supportMessages, supportThreads, telegramSupportMessages } from "@/db/schema";
import { ticketSubject, type SupportPriority } from "@/lib/telegram/support-rules";
import type { TicketCategory } from "@/lib/telegram/support-service";
import { phoneVariants } from "@/lib/leads/wa-bot-rules";
import { makeWaCode, normalizePhone, pickStaff, WA_CHAT_PREFIX, WA_CODE_PREFIX, WA_CODE_TTL_MS, WA_LINK_PREFIX, WA_TEAM_REPLY_MAX_AGE_MS, waChatId } from "./rules";

export interface WaStaff {
  staffUserId: string;
  staffName: string;
  role: string;
  outletId: string;
  outletName: string;
  phone: string;
  /** link = ditautkan dengan kode; outlet_phone = nomor HP di Profil Outlet (Owner). */
  via: "link" | "outlet_phone";
}

function parseLinkBody(body: string): { staffUserId: string } | null {
  try {
    const o = JSON.parse(body) as { staffUserId?: unknown };
    return typeof o.staffUserId === "string" ? { staffUserId: o.staffUserId } : null;
  } catch {
    return null;
  }
}

/** Semua staf aktif yang dikenali dari nomor WhatsApp ini (tautan kode + nomor Profil Outlet). */
export async function staffByPhone(phone628: string): Promise<WaStaff[]> {
  const out = new Map<string, WaStaff>();
  const links = await db
    .select({ outletId: telegramSupportMessages.outletId, body: telegramSupportMessages.body })
    .from(telegramSupportMessages)
    .where(eq(telegramSupportMessages.chatId, `${WA_LINK_PREFIX}${phone628}`))
    .orderBy(desc(telegramSupportMessages.createdAt))
    .limit(20);
  const ids = links.map((l) => parseLinkBody(l.body)?.staffUserId).filter((x): x is string => !!x);
  if (ids.length) {
    const rows = await db
      .select({ staffUserId: staffUsers.id, staffName: staffUsers.name, role: staffUsers.role, outletId: staffUsers.outletId, outletName: outlets.name, isActive: staffUsers.isActive })
      .from(staffUsers)
      .innerJoin(outlets, eq(outlets.id, staffUsers.outletId))
      .where(inArray(staffUsers.id, ids));
    for (const l of links) {
      const r = rows.find((x) => x.staffUserId === parseLinkBody(l.body)?.staffUserId);
      if (r && r.isActive && r.outletId === l.outletId && !out.has(r.outletId)) {
        out.set(r.outletId, { staffUserId: r.staffUserId, staffName: r.staffName, role: String(r.role), outletId: r.outletId, outletName: r.outletName, phone: phone628, via: "link" });
      }
    }
  }
  // Nomor di Profil Outlet → Owner outlet itu (tanpa perlu menautkan).
  const owned = await db
    .select({ outletId: outlets.id, outletName: outlets.name })
    .from(outlets)
    .where(inArray(sql<string>`regexp_replace(coalesce(${outlets.phone}, ''), '[^0-9]', '', 'g')`, phoneVariants(phone628)));
  for (const o of owned) {
    if (out.has(o.outletId)) continue;
    const [owner] = await db
      .select({ id: staffUsers.id, name: staffUsers.name })
      .from(staffUsers)
      .where(and(eq(staffUsers.outletId, o.outletId), eq(staffUsers.role, "owner"), eq(staffUsers.isActive, true)))
      .orderBy(asc(staffUsers.createdAt))
      .limit(1);
    if (owner) out.set(o.outletId, { staffUserId: owner.id, staffName: owner.name, role: "owner", outletId: o.outletId, outletName: o.outletName, phone: phone628, via: "outlet_phone" });
  }
  return [...out.values()];
}

/** Outlet percakapan WhatsApp terakhir nomor ini (dipakai bila nomor terdaftar di beberapa outlet). */
export async function lastOutletForChat(chatId: string): Promise<string | null> {
  const [row] = await db
    .select({ outletId: telegramSupportMessages.outletId })
    .from(telegramSupportMessages)
    .where(and(eq(telegramSupportMessages.chatId, chatId), sql`${telegramSupportMessages.outletId} is not null`))
    .orderBy(desc(telegramSupportMessages.createdAt))
    .limit(1);
  return row?.outletId ?? null;
}

export async function resolveWaStaff(phone628: string): Promise<{ staff: WaStaff | null; all: WaStaff[] }> {
  const all = await staffByPhone(phone628);
  if (all.length <= 1) return { staff: all[0] ?? null, all };
  return { staff: pickStaff(all, await lastOutletForChat(waChatId(phone628))), all };
}

/* ------------------------------------------------------------------ kode tautan ------------------------------------------------------------------ */

/** Kode sekali pakai untuk staf ini (kartu dashboard). */
export async function createWaLinkCode(staffUserId: string, outletId: string, staffName: string): Promise<string> {
  const code = makeWaCode(randomBytes(12));
  await db.insert(telegramSupportMessages).values({ chatId: `${WA_CODE_PREFIX}${code}`, outletId, role: "bot", body: JSON.stringify({ staffUserId, staffName }) });
  return code;
}

/**
 * Pakai kode: nomor WhatsApp pengirim ditautkan ke staf pemilik kode (satu nomor per staf — tautan
 * lama staf ini dilepas), lalu kode dihapus. null bila kode tidak dikenal / kedaluwarsa.
 */
export async function redeemWaLinkCode(code: string, phone628: string): Promise<WaStaff | null> {
  const since = new Date(Date.now() - WA_CODE_TTL_MS).toISOString();
  const [row] = await db
    .select()
    .from(telegramSupportMessages)
    .where(and(eq(telegramSupportMessages.chatId, `${WA_CODE_PREFIX}${code}`), gte(telegramSupportMessages.createdAt, since)))
    .orderBy(desc(telegramSupportMessages.createdAt))
    .limit(1);
  if (!row || !row.outletId) return null;
  const staffUserId = parseLinkBody(row.body)?.staffUserId ?? "";
  const [staff] = await db
    .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role, outletId: staffUsers.outletId, isActive: staffUsers.isActive })
    .from(staffUsers)
    .where(eq(staffUsers.id, staffUserId))
    .limit(1);
  if (!staff || !staff.isActive || staff.outletId !== row.outletId) return null;
  await unlinkWaStaff(staff.id);
  await db.insert(telegramSupportMessages).values({ chatId: `${WA_LINK_PREFIX}${phone628}`, outletId: staff.outletId, role: "bot", body: JSON.stringify({ staffUserId: staff.id, staffName: staff.name }) });
  await db.delete(telegramSupportMessages).where(eq(telegramSupportMessages.chatId, `${WA_CODE_PREFIX}${code}`));
  const [o] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, staff.outletId)).limit(1);
  // Baris percakapan di outlet ini → outlet ini yang dipakai bila nomor terdaftar di beberapa outlet.
  await db.insert(telegramSupportMessages).values({ chatId: waChatId(phone628), outletId: staff.outletId, role: "bot", body: `Nomor WhatsApp ditautkan ke ${staff.name}.` });
  return { staffUserId: staff.id, staffName: staff.name, role: String(staff.role), outletId: staff.outletId, outletName: o?.name ?? "Outlet", phone: phone628, via: "link" };
}

/** Nomor WhatsApp yang tertaut ke staf ini (kartu dashboard), atau null. */
export async function linkedWaPhone(staffUserId: string): Promise<string | null> {
  const [row] = await db
    .select({ chatId: telegramSupportMessages.chatId })
    .from(telegramSupportMessages)
    .where(and(like(telegramSupportMessages.chatId, `${WA_LINK_PREFIX}%`), sql`${telegramSupportMessages.body} like ${`%"staffUserId":"${staffUserId}"%`}`))
    .orderBy(desc(telegramSupportMessages.createdAt))
    .limit(1);
  return row ? row.chatId.slice(WA_LINK_PREFIX.length) : null;
}

/** Lepas tautan WhatsApp staf ini (semua nomor). */
export async function unlinkWaStaff(staffUserId: string) {
  await db
    .delete(telegramSupportMessages)
    .where(and(like(telegramSupportMessages.chatId, `${WA_LINK_PREFIX}%`), sql`${telegramSupportMessages.body} like ${`%"staffUserId":"${staffUserId}"%`}`));
}

/** Nomor HP di Profil Outlet (dinormalkan) — Owner bisa langsung chat dari nomor ini. */
export async function outletWaPhone(outletId: string): Promise<string | null> {
  const [o] = await db.select({ phone: outlets.phone }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  return normalizePhone(o?.phone);
}

/* ------------------------------------------------------------------ tiket ------------------------------------------------------------------ */

export async function createWaTicket(input: {
  staff: WaStaff;
  priority: SupportPriority;
  category: TicketCategory;
  summary: string;
  tried?: string;
  accountStatus?: string;
}): Promise<{ threadId: string }> {
  const now = new Date().toISOString();
  const who = `${input.staff.staffName} (via WhatsApp +${input.staff.phone})`;
  const body = [
    `Diteruskan dari chat WhatsApp — prioritas ${input.priority}.`,
    `Masalah: ${input.summary.trim()}`,
    input.tried?.trim() ? `Sudah dicoba: ${input.tried.trim()}` : null,
    input.accountStatus?.trim() ? `Status akun saat itu: ${input.accountStatus.trim()}` : null,
    "Balasan tim di tiket ini otomatis diteruskan ke WhatsApp merchant.",
  ]
    .filter(Boolean)
    .join("\n");
  const [thread] = await db
    .insert(supportThreads)
    .values({ outletId: input.staff.outletId, subject: ticketSubject(input.summary, input.priority), category: input.category, lastMessageAt: now })
    .returning({ id: supportThreads.id });
  await db.insert(supportMessages).values({ threadId: thread.id, sender: "outlet", senderName: who, body });
  return { threadId: thread.id };
}

export async function appendToWaTicket(threadId: string, staff: WaStaff, text: string) {
  const now = new Date().toISOString();
  await db.insert(supportMessages).values({ threadId, sender: "outlet", senderName: `${staff.staffName} (via WhatsApp)`, body: text });
  await db.update(supportThreads).set({ lastMessageAt: now, status: "open" }).where(and(eq(supportThreads.id, threadId), eq(supportThreads.outletId, staff.outletId)));
}

/* ------------------------------------------------------------------ balasan tim ------------------------------------------------------------------ */

/** Balasan tim untuk tiket asal WhatsApp yang belum terkirim (dikirim oleh proses bot). */
export async function pendingWaTeamReplies(limit = 10) {
  const since = new Date(Date.now() - WA_TEAM_REPLY_MAX_AGE_MS).toISOString();
  return db
    .select()
    .from(telegramSupportMessages)
    .where(and(like(telegramSupportMessages.chatId, `${WA_CHAT_PREFIX}%`), eq(telegramSupportMessages.role, "team"), isNull(telegramSupportMessages.tgMessageId), gte(telegramSupportMessages.createdAt, since)))
    .orderBy(telegramSupportMessages.createdAt)
    .limit(limit);
}

/** Tandai terkirim dengan id pesan WhatsApp — balasan merchant ke pesan itu masuk ke tiketnya. */
export async function markWaTeamReplySent(logId: string, waMessageId: string) {
  await db.update(telegramSupportMessages).set({ tgMessageId: waMessageId }).where(eq(telegramSupportMessages.id, logId));
}

/** Nomor ini sudah diberi tahu "belum tertaut" dalam N ms terakhir? (rem pesan ke nomor asing). */
export async function notLinkedNoticeSentSince(chatId: string, sinceMs: number): Promise<boolean> {
  const since = new Date(Date.now() - sinceMs).toISOString();
  const [row] = await db
    .select({ id: telegramSupportMessages.id })
    .from(telegramSupportMessages)
    .where(and(eq(telegramSupportMessages.chatId, chatId), eq(telegramSupportMessages.role, "bot"), gte(telegramSupportMessages.createdAt, since)))
    .limit(1);
  return !!row;
}
