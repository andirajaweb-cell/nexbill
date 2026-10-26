/**
 * Aturan murni balas-otomatis tiket Customer Service (tanpa DB/AI). Diuji di autoreply-rules.test.ts.
 *
 * Penanda tanpa migrasi: pesan bot disimpan sebagai sender "platform_admin" dengan senderName yang
 * diawali BOT_SENDER. Bila bot meneruskan ke tim, senderName = "Bot NEXBILL · perlu tim P2" — dari
 * situ Platform Admin tahu tiket mana yang menunggu manusia.
 */
import type { ChatTurn, SupportPriority } from "@/lib/telegram/support-rules";

export const BOT_SENDER = "Bot NEXBILL";
const NEEDS_TEAM = " · perlu tim ";

/** Manusia (tim) membalas di tiket ini dalam rentang ini → bot diam, manusia yang menangani. */
export const HUMAN_ACTIVE_MS = 2 * 3600_000;
/** Rem: maksimal balasan bot per tiket per jam (mencegah putaran tanpa akhir). */
export const MAX_BOT_REPLIES_PER_HOUR = 8;

export function botSenderName(escalatedPriority: SupportPriority | null): string {
  return escalatedPriority ? `${BOT_SENDER}${NEEDS_TEAM}${escalatedPriority}` : BOT_SENDER;
}

export function isBotSender(name: string | null | undefined): boolean {
  return !!name && name.startsWith(BOT_SENDER);
}

/** Prioritas dari senderName bot yang meneruskan ke tim; null bila bukan penanda "perlu tim". */
export function escalatedPriorityOf(name: string | null | undefined): SupportPriority | null {
  if (!name || !name.startsWith(BOT_SENDER + NEEDS_TEAM)) return null;
  const p = name.slice((BOT_SENDER + NEEDS_TEAM).length).trim();
  return (["P1", "P2", "P3", "P4"] as const).includes(p as SupportPriority) ? (p as SupportPriority) : null;
}

export interface ThreadMsg {
  id: string;
  sender: "outlet" | "platform_admin";
  senderName: string | null;
  body: string;
  attachmentName?: string | null;
  attachmentType?: string | null;
  createdAt: string;
}

export type SkipReason = "no_outlet_message" | "human_active" | "rate_limited" | "disabled";

/** Haruskah bot membalas pesan terakhir tiket ini? (pesan diurutkan lama → baru) */
export function shouldAutoReply(msgs: ThreadMsg[], now: number, enabled = true): { ok: true } | { ok: false; reason: SkipReason } {
  if (!enabled) return { ok: false, reason: "disabled" };
  const last = msgs[msgs.length - 1];
  if (!last || last.sender !== "outlet") return { ok: false, reason: "no_outlet_message" };
  const humanRecent = msgs.some((m) => m.sender === "platform_admin" && !isBotSender(m.senderName) && now - new Date(m.createdAt).getTime() < HUMAN_ACTIVE_MS);
  if (humanRecent) return { ok: false, reason: "human_active" };
  const botLastHour = msgs.filter((m) => m.sender === "platform_admin" && isBotSender(m.senderName) && now - new Date(m.createdAt).getTime() < 3600_000).length;
  if (botLastHour >= MAX_BOT_REPLIES_PER_HOUR) return { ok: false, reason: "rate_limited" };
  return { ok: true };
}

/** Pesan tiket → riwayat untuk otak bot (lampiran disebut dengan namanya; bot tidak bisa melihat isinya). */
export function threadToTurns(msgs: ThreadMsg[]): ChatTurn[] {
  return msgs.slice(-14).map((m) => {
    const attach = m.attachmentName || m.attachmentType ? `[lampiran: ${m.attachmentName || m.attachmentType}] ` : "";
    const body = `${attach}${m.body}`.trim() || "[lampiran]";
    const role: ChatTurn["role"] = m.sender === "outlet" ? "user" : isBotSender(m.senderName) ? "bot" : "team";
    return { role, body, createdAt: m.createdAt };
  });
}

/** Penerusan ke tim yang masih menunggu: prioritas tertinggi dari pesan bot "perlu tim" setelah balasan manusia terakhir. */
export function pendingEscalation(msgs: Pick<ThreadMsg, "sender" | "senderName">[]): SupportPriority | null {
  let best: SupportPriority | null = null;
  for (const m of msgs) {
    if (m.sender === "platform_admin" && !isBotSender(m.senderName)) best = null; // manusia sudah membalas
    const p = m.sender === "platform_admin" ? escalatedPriorityOf(m.senderName) : null;
    if (p && (!best || p < best)) best = p; // "P1" < "P2" secara huruf = lebih mendesak
  }
  return best;
}

/** Perlu dibalas manusia? Tiket terbuka dan (pesan terakhir dari outlet belum dijawab, atau bot sudah meneruskan ke tim dan belum ada balasan manusia). */
export function needsHuman(msgs: Pick<ThreadMsg, "sender" | "senderName">[], status: "open" | "resolved"): { needs: boolean; priority: SupportPriority | null } {
  if (status !== "open" || msgs.length === 0) return { needs: false, priority: null };
  const priority = pendingEscalation(msgs);
  const last = msgs[msgs.length - 1];
  return { needs: last.sender === "outlet" || priority !== null, priority };
}
