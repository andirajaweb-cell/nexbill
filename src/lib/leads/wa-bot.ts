/**
 * Operasi database bot WhatsApp CRM — dipakai bersama oleh scripts/whatsapp-bot.mts (proses bot)
 * dan rute /api/platform-admin/** (web app). Aturan murninya di ./wa-bot-rules.ts.
 */
import { and, asc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { platformLeads, platformWaBotStatus, platformWaOutbox, platformWaTemplates } from "@/db/schema";
import { addLeadActivity } from "./service";
import { inboundActivityText, outboundActivityText, phoneVariants, startOfTodayWibIso } from "./wa-bot-rules";

const STATUS_ID = "main";

/* ------------------------------------------------------------------ status ------------------------------------------------------------------ */

export async function getBotStatus() {
  const [row] = await db.select().from(platformWaBotStatus).where(eq(platformWaBotStatus.id, STATUS_ID)).limit(1);
  return row ?? null;
}

type StatusPatch = Partial<Omit<typeof platformWaBotStatus.$inferInsert, "id" | "updatedAt">>;

export async function writeBotStatus(patch: StatusPatch) {
  const now = new Date().toISOString();
  await db
    .insert(platformWaBotStatus)
    .values({ id: STATUS_ID, ...patch, lastHeartbeatAt: patch.lastHeartbeatAt ?? now, updatedAt: now })
    .onConflictDoUpdate({ target: platformWaBotStatus.id, set: { ...patch, lastHeartbeatAt: patch.lastHeartbeatAt ?? now, updatedAt: now } });
}

/* ------------------------------------------------------------------ outbox ------------------------------------------------------------------ */

export async function countSentSince(iso: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(platformWaOutbox)
    .where(and(eq(platformWaOutbox.status, "sent"), gte(platformWaOutbox.sentAt, iso)));
  return r?.n ?? 0;
}

export async function outboxSummary() {
  const rows = await db
    .select({ status: platformWaOutbox.status, n: sql<number>`count(*)::int` })
    .from(platformWaOutbox)
    .groupBy(platformWaOutbox.status);
  const by = Object.fromEntries(rows.map((r) => [r.status, r.n])) as Record<string, number>;
  return {
    pending: (by.pending ?? 0) + (by.sending ?? 0),
    failed: by.failed ?? 0,
    sentToday: await countSentSince(startOfTodayWibIso()),
  };
}

/** Ambil pesan pending tertua dan tandai "sending" (klaim) supaya tidak dikirim dua kali. */
export async function claimPending(limit: number) {
  const rows = await db.select().from(platformWaOutbox).where(eq(platformWaOutbox.status, "pending")).orderBy(asc(platformWaOutbox.createdAt)).limit(limit);
  if (rows.length === 0) return [];
  await db
    .update(platformWaOutbox)
    .set({ status: "sending", attempts: sql`${platformWaOutbox.attempts} + 1` })
    .where(and(inArray(platformWaOutbox.id, rows.map((r) => r.id)), eq(platformWaOutbox.status, "pending")));
  return rows;
}

/** Pesan yang tertahan "sending" (bot mati di tengah kirim) dikembalikan ke antrean saat bot start. */
export async function requeueStuckSending() {
  await db.update(platformWaOutbox).set({ status: "pending" }).where(eq(platformWaOutbox.status, "sending"));
}

export async function markOutboxFailed(id: string, error: string) {
  await db.update(platformWaOutbox).set({ status: "failed", error: error.slice(0, 500) }).where(eq(platformWaOutbox.id, id));
}

/**
 * Pesan berhasil terkirim: tandai sent, catat aktivitas "WhatsApp" di lead, stempel
 * lastContactedAt, dan naikkan lead "baru" → "dihubungi" (aturan yang sama dengan
 * POST /api/platform-admin/leads/[id]/activities).
 */
export async function markOutboxSent(row: typeof platformWaOutbox.$inferSelect) {
  const now = new Date().toISOString();
  await db.update(platformWaOutbox).set({ status: "sent", sentAt: now, error: null }).where(eq(platformWaOutbox.id, row.id));
  const adminRef = { sub: row.createdBy ?? null, name: row.createdByName ?? "Bot WhatsApp" };
  await addLeadActivity(row.leadId, "whatsapp", outboundActivityText(row.templateTitle, row.body), adminRef);
  const [lead] = await db.select({ status: platformLeads.status }).from(platformLeads).where(eq(platformLeads.id, row.leadId)).limit(1);
  const patch: Partial<typeof platformLeads.$inferInsert> = { lastContactedAt: now, updatedAt: now };
  if (lead?.status === "baru") patch.status = "dihubungi";
  await db.update(platformLeads).set(patch).where(eq(platformLeads.id, row.leadId));
  if (patch.status) await addLeadActivity(row.leadId, "status", "Baru → Sudah Dihubungi", adminRef);
  if (row.templateId) {
    await db
      .update(platformWaTemplates)
      .set({ usageCount: sql`${platformWaTemplates.usageCount} + 1`, lastUsedAt: now })
      .where(eq(platformWaTemplates.id, row.templateId));
  }
}

/* ------------------------------------------------------------------ inbound ------------------------------------------------------------------ */

/**
 * Balasan WhatsApp masuk ke nomor bot. Dicatat ke SEMUA lead yang nomornya cocok (waNumber, atau
 * kolom phone dalam format 628…/08…/8…). Nomor yang bukan lead diabaikan — bot ini khusus CRM.
 * Mengembalikan jumlah lead yang tercatat.
 */
export async function recordInbound(phone628: string, text: string): Promise<number> {
  const variants = phoneVariants(phone628);
  const leads = await db
    .select({ id: platformLeads.id })
    .from(platformLeads)
    .where(or(eq(platformLeads.waNumber, phone628), inArray(sql<string>`regexp_replace(coalesce(${platformLeads.phone}, ''), '[^0-9]', '', 'g')`, variants)));
  if (leads.length === 0) return 0;
  const now = new Date().toISOString();
  for (const l of leads) {
    await addLeadActivity(l.id, "whatsapp", inboundActivityText(text), { sub: null, name: "Lead (balasan WA)" });
    await db.update(platformLeads).set({ lastInboundAt: now, inboundUnread: true, updatedAt: now }).where(eq(platformLeads.id, l.id));
  }
  return leads.length;
}
