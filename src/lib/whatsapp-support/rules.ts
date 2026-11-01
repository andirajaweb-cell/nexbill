/**
 * Aturan murni support 24 jam lewat WhatsApp (tanpa DB/Baileys/AI) — diuji di rules.test.ts.
 *
 * Bot WhatsApp NEXBILL sekarang punya dua tugas: CRM platform-admin (lead) dan support 24 jam untuk
 * owner & kasir outlet. Nomor dikenali dari tautan kode (kartu "Support 24 jam di WhatsApp" di dashboard:
 * merchant mengirim "NEXBILL KODE ABC123" — sekaligus membuktikan nomor itu miliknya), atau dari nomor HP
 * di Profil Outlet (dikenali sebagai Owner).
 *
 * WhatsApp (Baileys) tidak punya tombol yang andal, jadi menu & penilaian memakai balasan angka.
 */

/** Prefix chat_id di log telegram_support_messages untuk percakapan WhatsApp (tanpa migrasi baru). */
export const WA_CHAT_PREFIX = "wa:";
/** Prefix baris tautan nomor ↔ staf (dibuat saat kode dari dashboard dikirim lewat WhatsApp). */
export const WA_LINK_PREFIX = "wa-link:";
/** Prefix baris kode tautan sekali pakai di log yang sama. */
export const WA_CODE_PREFIX = "wa-code:";
export const WA_CODE_TTL_MS = 15 * 60_000;
/** Status menu/penilaian dianggap basi setelah ini (merchant mengetik angka lama = pesan biasa). */
export const WA_STATE_TTL_MS = 30 * 60_000;
/** Balasan "belum tertaut" ke nomor asing paling sering sekali per ini. */
export const WA_NOT_LINKED_COOLDOWN_MS = 24 * 3600_000;
/** Balasan tim yang menunggu dikirim bot: hanya yang lebih baru dari ini (bot mati lama → tidak membanjiri). */
export const WA_TEAM_REPLY_MAX_AGE_MS = 3 * 24 * 3600_000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function waChatId(phone628: string): string {
  return `${WA_CHAT_PREFIX}${phone628}`;
}

export function isWaChatId(chatId: string | null | undefined): boolean {
  return !!chatId && chatId.startsWith(WA_CHAT_PREFIX);
}

export function phoneOfWaChat(chatId: string): string | null {
  if (!isWaChatId(chatId)) return null;
  const p = chatId.slice(WA_CHAT_PREFIX.length);
  return /^\d{8,15}$/.test(p) ? p : null;
}

/** Kode 6 karakter tanpa huruf/angka yang mirip (0/O, 1/I/L). */
export function makeWaCode(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += CODE_ALPHABET[bytes[i % bytes.length] % CODE_ALPHABET.length];
  return out;
}

/** "NEXBILL KODE AB12CD", "nexbill ab12cd", "kode AB12CD" → "AB12CD"; selain itu null. */
export function parseLinkMessage(text: string): string | null {
  const m = /^\s*(?:nexbill\s*)?(?:kode|code)?\s*[:#-]?\s*([A-Za-z0-9]{6})\s*$/i.exec(text);
  if (!m) return null;
  if (!/nexbill|kode|code/i.test(text)) return null; // 6 karakter saja (mis. "makasi") bukan kode
  const code = m[1].toUpperCase();
  return [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

/** Nomor telepon apa pun (0812…, +62 812…, 62812…) → 62812… (Indonesia); nomor negara lain tetap digit. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length < 8 || d.length > 15) return null;
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  if (d.startsWith("8") && d.length <= 13) return `62${d}`;
  return d;
}

/** Nomor dari status bot ("628123:12@s.whatsapp.net" / "628123@s.whatsapp.net") → "628123". */
export function botPhoneFromJid(jid: string | null | undefined): string | null {
  const m = /^(\d{8,15})(?::\d+)?@/.exec(jid ?? "");
  return m ? m[1] : null;
}

/** Tautan wa.me ke nomor bot dengan teks terisi. */
export function waMeUrl(botPhone: string, text?: string): string {
  return `https://wa.me/${botPhone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export type WaCommand = "menu" | "team" | "status" | "group" | "help" | "outlet";

/** Kata perintah (tanpa garis miring, bahasa apa pun yang umum). */
export function parseWaCommand(text: string): { command: WaCommand; arg: string } | null {
  const t = text.trim().replace(/^\//, "");
  const m = /^(\S+)(?:\s+([\s\S]*))?$/.exec(t);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const arg = (m[2] ?? "").trim();
  const map: Record<string, WaCommand> = {
    menu: "menu",
    "0": "menu",
    tim: "team",
    team: "team",
    cs: "team",
    admin: "team",
    status: "status",
    grup: "group",
    group: "group",
    bantuan: "help",
    help: "help",
    outlet: "outlet",
  };
  const command = map[word];
  if (!command) return null;
  // "tim" dengan kalimat panjang ("tim saya tidak bisa login") bukan perintah.
  if (command !== "outlet" && command !== "team" && arg) return null;
  if (command === "team" && arg.split(/\s+/).length > 12) return null;
  return { command, arg };
}

/** Balasan angka murni ("1", " 2 ", "3.") → angka; selain itu null. */
export function parseNumberReply(text: string): number | null {
  const m = /^\s*(\d{1,2})\s*[.)]?\s*$/.exec(text);
  return m ? Number(m[1]) : null;
}

export type WaMenuState =
  | { kind: "home"; topics: string[]; at: number }
  | { kind: "topic"; topic: string; keys: string[]; at: number }
  | { kind: "feedback"; logId: string; at: number }
  | { kind: "outlet"; outletIds: string[]; at: number };

export function stateFresh(s: WaMenuState | undefined, now = Date.now()): s is WaMenuState {
  return !!s && now - s.at <= WA_STATE_TTL_MS;
}

/** Daftar bernomor untuk WhatsApp. */
export function numberedList(items: string[], start = 1): string {
  return items.map((x, i) => `${i + start}. ${x}`).join("\n");
}

/**
 * Markdown sederhana dari AI → format WhatsApp: **tebal** → *tebal*, judul "# " dibuang, tautan
 * [teks](url) → teks (url). WhatsApp tidak menampilkan Markdown biasa.
 */
export function toWhatsAppText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "*$1*")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .trim();
}

/** Pilih staf saat satu nomor dikenali di beberapa outlet: outlet percakapan terakhir → owner → yang pertama. */
export function pickStaff<T extends { outletId: string; role: string }>(matches: T[], lastOutletId: string | null): T | null {
  if (matches.length === 0) return null;
  if (lastOutletId) {
    const m = matches.find((x) => x.outletId === lastOutletId);
    if (m) return m;
  }
  return matches.find((x) => x.role === "owner") ?? matches[0];
}
