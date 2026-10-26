/**
 * Aturan murni bot Telegram support 24 jam (tanpa DB/Telegram/AI) — dipakai webhook, bot AI, halaman
 * platform-admin. Mengikuti dokumen "Kerangka Layanan Chatbot Support 24 Jam NEXBILL". Diuji di
 * support-rules.test.ts.
 */
import type { HelpCategory } from "@/lib/help/types";

export type SupportPriority = "P1" | "P2" | "P3" | "P4";
export const PRIORITIES: SupportPriority[] = ["P1", "P2", "P3", "P4"];

/** Kode tautan berlaku 15 menit — cukup untuk membuka Telegram dan menekan Start. */
export const LINK_CODE_TTL_MS = 15 * 60_000;
/** Batas pesan Telegram (karakter). */
export const TELEGRAM_MAX_CHARS = 4096;
/** Jeda tanpa pesan merchant lebih dari ini = percakapan baru (untuk metrik & konteks AI). */
export const CONVERSATION_GAP_MS = 6 * 3600_000;
/** Riwayat yang dikirim ke AI sebagai konteks. */
export const CONTEXT_MESSAGES = 12;

/** Jam tim membalas tiket (WIB). P1 di luar jam ini tetap mendapat langkah darurat + notifikasi petugas jaga. */
export const SUPPORT_DAYS = [1, 2, 3, 4, 5, 6]; // Senin–Sabtu (0 = Minggu)
export const SUPPORT_START_HOUR = 9;
export const SUPPORT_END_HOUR = 17;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Kode acak untuk parameter /start (Telegram mengizinkan A-Z a-z 0-9 _ -, maks 64). */
export function makeLinkCode(randomBytes: Uint8Array): string {
  let out = "";
  for (const b of randomBytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return out;
}

export interface ParsedCommand {
  command: string;
  arg: string;
}

/** "/start@NexbillBot abc" → { command: "start", arg: "abc" }; teks biasa → null. */
export function parseCommand(text: string): ParsedCommand | null {
  const m = /^\/([a-zA-Z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(text.trim());
  if (!m) return null;
  return { command: m[1].toLowerCase(), arg: (m[2] ?? "").trim() };
}

/** Kata kunci darurat (P1) — outlet tidak bisa menagih / memulai sesi sekarang. */
const URGENT_PATTERNS: RegExp[] = [
  /semua\s+(tv|unit|layar)/i,
  /tidak\s+bisa\s+(login|masuk|bayar|mulai|buka|transaksi|jualan|menagih)/i,
  /(gak|ga|nggak|enggak|tak)\s+bisa\s+(login|masuk|bayar|mulai|buka|transaksi|jualan)/i,
  /data\s+(transaksi\s+)?hilang/i,
  /dashboard\s+(tidak|gak|ga|nggak)\s+(bisa\s+)?(dibuka|terbuka|muncul)/i,
  /(down|error)\s+semua/i,
  /all\s+(tvs?|units?|screens?)/i,
  /can(?:'|no)?t\s+(log\s*in|login|pay|start|open|sell|charge)/i,
  /data\s+(is\s+)?(lost|gone|missing)/i,
];

export function isUrgentText(text: string): boolean {
  return URGENT_PATTERNS.some((re) => re.test(text));
}

/** Naik satu tingkat (P4 → P3 → P2 → P1), P1 tetap P1. */
export function escalate(p: SupportPriority, steps = 1): SupportPriority {
  const i = Math.max(0, PRIORITIES.indexOf(p) - steps);
  return PRIORITIES[i];
}

/** Prioritas paling tinggi (angka paling kecil) dari beberapa kandidat. */
export function highestPriority(...ps: Array<SupportPriority | null | undefined>): SupportPriority | null {
  const valid = ps.filter((p): p is SupportPriority => !!p && PRIORITIES.includes(p));
  if (valid.length === 0) return null;
  return valid.sort((a, b) => PRIORITIES.indexOf(a) - PRIORITIES.indexOf(b))[0];
}

/** Prioritas minimal yang dipaksakan kode, bukan AI: kata kunci darurat → P1; masalah sama berulang → naik satu tingkat. */
export function enforcedPriority(aiPriority: SupportPriority, ctx: { text: string; repeatedProblem?: boolean; botFailedTwice?: boolean }): SupportPriority {
  let p = aiPriority;
  if (ctx.repeatedProblem || ctx.botFailedTwice) p = escalate(p);
  if (isUrgentText(ctx.text)) p = "P1";
  return p;
}

/** Jam WIB (UTC+7) dari sebuah waktu. */
function wib(now: Date) {
  const d = new Date(now.getTime() + 7 * 3600_000);
  return { day: d.getUTCDay(), hour: d.getUTCHours() };
}

export function isSupportHours(now = new Date()): boolean {
  const { day, hour } = wib(now);
  return SUPPORT_DAYS.includes(day) && hour >= SUPPORT_START_HOUR && hour < SUPPORT_END_HOUR;
}

/** Potong jawaban panjang menjadi beberapa pesan Telegram, sebisa mungkin di batas paragraf/baris. */
export function splitTelegramText(text: string, max = TELEGRAM_MAX_CHARS): string[] {
  const out: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut <= 0) cut = max;
    out.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) out.push(rest);
  return out;
}

export interface LogRow {
  chatId: string;
  role: "user" | "bot" | "team";
  resolution: "answered" | "ticket" | "urgent" | null;
  createdAt: string;
}

export interface ConversationStats {
  conversations: number;
  resolvedByBot: number;
  tickets: number;
  urgent: number;
  /** Tingkat selesai di bot (0–1); null bila belum ada percakapan. */
  deflection: number | null;
}

/**
 * Metrik dokumen kerangka: percakapan = rangkaian pesan satu chat tanpa jeda > 6 jam; "selesai di
 * bot" = tidak ada tiket di percakapan itu. Pesan tim tidak membuka percakapan baru.
 */
export function conversationStats(rows: LogRow[], gapMs = CONVERSATION_GAP_MS): ConversationStats {
  const byChat = new Map<string, LogRow[]>();
  for (const r of rows) {
    if (!byChat.has(r.chatId)) byChat.set(r.chatId, []);
    byChat.get(r.chatId)!.push(r);
  }
  let conversations = 0;
  let resolvedByBot = 0;
  let tickets = 0;
  let urgent = 0;
  for (const list of byChat.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    let open = false;
    let lastUserAt = 0;
    let hadTicket = false;
    let hadUrgent = false;
    const close = () => {
      if (!open) return;
      conversations++;
      if (hadUrgent) urgent++;
      if (hadTicket || hadUrgent) tickets++;
      else resolvedByBot++;
    };
    for (const r of list) {
      const at = new Date(r.createdAt).getTime();
      if (r.role === "user") {
        if (!open || at - lastUserAt > gapMs) {
          close();
          open = true;
          hadTicket = false;
          hadUrgent = false;
        }
        lastUserAt = at;
      } else if (r.role === "bot" && open) {
        if (r.resolution === "ticket") hadTicket = true;
        if (r.resolution === "urgent") hadUrgent = true;
      }
    }
    close();
  }
  return { conversations, resolvedByBot, tickets, urgent, deflection: conversations ? resolvedByBot / conversations : null };
}

/** Pratinjau singkat untuk judul tiket. */
export function ticketSubject(summary: string, priority: SupportPriority): string {
  const one = summary.replace(/\s+/g, " ").trim();
  const cut = one.length > 70 ? `${one.slice(0, 70)}…` : one;
  return `[Telegram ${priority}] ${cut}`;
}

export interface ChatTurn {
  role: "user" | "bot" | "team";
  body: string;
  createdAt: string;
}

/** Riwayat log → pesan AI yang bergantian user/assistant dan diawali user (syarat API). */
export function toChatMessages(turns: ChatTurn[]): Array<{ role: "user" | "assistant"; content: string }> {
  const out: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const t of turns) {
    const role = t.role === "user" ? "user" : "assistant";
    const text = t.role === "team" ? `[Balasan tim NEXBILL] ${t.body}` : t.body;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n\n${text}`;
    else out.push({ role, content: text });
  }
  while (out.length && out[0].role !== "user") out.shift();
  return out;
}

/** Satu kategori Panduan Bantuan sebagai teks polos untuk AI. */
export function categoryToText(c: HelpCategory): string {
  const lines: string[] = [`# ${c.label}`];
  if (c.navHint) lines.push(`Menu: ${c.navHint}`);
  lines.push(c.summary);
  if (c.roles) lines.push(`Siapa: ${c.roles}`);
  c.steps?.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  c.notes?.forEach((n) => lines.push(`Catatan: ${n}`));
  for (const s of c.subsections ?? []) {
    lines.push(`## ${s.title}`);
    if (s.navHint) lines.push(`Menu: ${s.navHint}`);
    if (s.intro) lines.push(s.intro);
    s.steps?.forEach((st, i) => lines.push(`${i + 1}. ${st}`));
    s.notes?.forEach((n) => lines.push(`Catatan: ${n}`));
  }
  return lines.join("\n");
}
