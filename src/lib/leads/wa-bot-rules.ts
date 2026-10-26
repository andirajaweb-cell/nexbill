/**
 * Aturan murni bot WhatsApp CRM (tanpa DB/Baileys) — dipakai scripts/whatsapp-bot.mts, rute API
 * platform-admin, dan halaman /platform-admin/whatsapp-bot. Diuji di wa-bot-rules.test.ts.
 */

/** Bot dianggap online kalau terhubung DAN heartbeat terakhir belum lebih dari batas ini. */
export const BOT_HEARTBEAT_INTERVAL_MS = 30_000;
export const BOT_STALE_AFTER_MS = 3 * BOT_HEARTBEAT_INTERVAL_MS;

/** Batas pesan CRM per hari (WIB) — rem darurat agar nomor tidak dianggap spam. Bisa diubah lewat env WA_BOT_DAILY_LIMIT. */
export const DEFAULT_DAILY_LIMIT = 150;

/** Jeda acak antarpesan keluar (ms) — pengiriman beruntun tanpa jeda adalah pola spam paling mudah dikenali. */
export const SEND_DELAY_MIN_MS = 4_000;
export const SEND_DELAY_MAX_MS = 9_000;

/**
 * online         — terhubung & heartbeat segar
 * menunggu_scan  — bot hidup, QR siap di-scan
 * menghubungkan  — bot hidup tapi belum ada QR/koneksi (jeda beberapa detik saat bot membuat QR baru
 *                  setelah putaran QR habis, atau saat menyambung ulang). BUKAN offline.
 * offline        — heartbeat berhenti (proses bot mati / tidak bisa menulis ke database)
 */
export type BotState = "online" | "menunggu_scan" | "menghubungkan" | "offline" | "belum_pernah";

export interface BotStatusLike {
  connected: boolean;
  qrDataUrl: string | null;
  lastHeartbeatAt: string | null;
}

export function botState(s: BotStatusLike | null | undefined, now = Date.now()): BotState {
  if (!s) return "belum_pernah";
  const fresh = s.lastHeartbeatAt != null && now - new Date(s.lastHeartbeatAt).getTime() <= BOT_STALE_AFTER_MS;
  if (!fresh) return "offline";
  if (s.connected) return "online";
  if (s.qrDataUrl) return "menunggu_scan";
  return "menghubungkan";
}

export const BOT_STATE_LABEL: Record<BotState, string> = {
  online: "Online",
  menunggu_scan: "Menunggu scan QR",
  menghubungkan: "Menyiapkan QR / menghubungkan",
  offline: "Offline",
  belum_pernah: "Belum pernah dijalankan",
};

/* ------------------------------------------------------------ sambung ulang & QR ------------------------------------------------------------ */

/** Kode tutup koneksi Baileys yang relevan (DisconnectReason + 405 "Connection Failure" yang tidak ada di enum). */
const CLOSE_CODE_NAME: Record<number, string> = {
  401: "logout",
  403: "ditolak WhatsApp",
  405: "Connection Failure",
  408: "timeout",
  411: "multi-device tidak cocok",
  428: "koneksi ditutup",
  440: "sesi dipakai di tempat lain",
  500: "sesi rusak",
  503: "layanan WhatsApp tidak tersedia",
  515: "perlu restart",
};

export function closeCodeName(code: number | undefined): string {
  return code == null ? "tanpa kode" : `${CLOSE_CODE_NAME[code] ?? "lainnya"} ${code}`;
}

/** Setelah sekian kali gagal berturut-turut TANPA pernah menampilkan QR, sesi belum-tertaut dibuang & versi diambil ulang. */
export const RESET_UNLINKED_AFTER_FAILURES = 3;
/** Bot belum terhubung dan belum punya QR selama ini → socket dianggap macet dan dibuat ulang. */
export const NO_QR_WATCHDOG_MS = 90_000;
/** Batas waktu ambil versi WhatsApp Web (tanpa ini fetch bisa menggantung beberapa menit → QR tidak pernah muncul). */
export const VERSION_FETCH_TIMEOUT_MS = 10_000;

/** Jeda sebelum mencoba lagi: 3 dtk, 6, 12, 24, 48, maks 60 dtk. */
export function reconnectDelayMs(consecutiveFailures: number): number {
  const n = Math.max(0, consecutiveFailures - 1);
  return Math.min(60_000, 3_000 * 2 ** Math.min(n, 5));
}

export interface CloseInfo {
  statusCode: number | undefined;
  /** creds.me sudah ada = nomor pernah ditautkan. */
  linked: boolean;
  /** Socket yang baru ditutup sempat menampilkan QR. */
  hadQr: boolean;
  /** Berapa kali berturut-turut socket tutup tanpa QR & tanpa terhubung (termasuk yang ini). */
  failuresWithoutQr: number;
  retryInMs: number;
}

/** Catatan yang ditampilkan di halaman platform-admin saat koneksi tertutup — menyebut kode supaya bisa didiagnosis. */
export function closeNote(c: CloseInfo): string {
  const detik = Math.round(c.retryInMs / 1000);
  if (c.statusCode === 401) return "Logout dari HP — hapus folder data/wa-auth di server bot lalu jalankan ulang untuk scan QR baru.";
  if (!c.linked && c.hadQr && c.statusCode === 408) return "QR sebelumnya kedaluwarsa tanpa di-scan — membuat QR baru…";
  if (!c.linked) {
    const reset = c.failuresWithoutQr >= RESET_UNLINKED_AFTER_FAILURES ? " Sesi login sementara dibuang & versi WhatsApp diambil ulang." : "";
    return `Gagal mendapat QR dari WhatsApp (${closeCodeName(c.statusCode)}), percobaan ke-${c.failuresWithoutQr} — coba lagi dalam ${detik} dtk.${reset} Bila terus berulang: cek internet server bot ke web.whatsapp.com dan log bot.`;
  }
  return `Terputus (${closeCodeName(c.statusCode)}) — menyambung ulang dalam ${detik} dtk…`;
}

export function sendDelayMs(rand = Math.random()): number {
  return Math.round(SEND_DELAY_MIN_MS + rand * (SEND_DELAY_MAX_MS - SEND_DELAY_MIN_MS));
}

export function parseDailyLimit(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_DAILY_LIMIT;
}

/** Awal hari ini (00:00 WIB) dalam ISO UTC — untuk menghitung pesan terkirim "hari ini". */
export function startOfTodayWibIso(now = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 3600_000);
  const midnightWibAsUtc = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()) - 7 * 3600_000;
  return new Date(midnightWibAsUtc).toISOString();
}

/**
 * Nomor telepon (digit, 628xxx) dari JID Baileys. Baileys v7 bisa memberi JID "@lid" (ID privasi,
 * BUKAN nomor telepon) — yang dipakai hanya JID "@s.whatsapp.net". Kandidat dicoba berurutan
 * (remoteJid, remoteJidAlt, senderPn, participantAlt, ...), mana yang pertama berupa nomor.
 */
export function phoneFromJids(candidates: Array<string | null | undefined>): string | null {
  for (const jid of candidates) {
    if (!jid) continue;
    const m = /^(\d{8,15})(?::\d+)?@s\.whatsapp\.net$/.exec(jid);
    if (m) return m[1];
  }
  return null;
}

/** 628xxx → JID untuk dikirimi pesan. */
export function jidFromPhone(phone: string): string {
  return `${phone.replace(/\D/g, "")}@s.whatsapp.net`;
}

/** Variasi penulisan nomor yang mungkin tersimpan di kolom phone lead (628…, 08…, 8…). */
export function phoneVariants(phone628: string): string[] {
  if (!phone628.startsWith("62")) return [phone628];
  const local = phone628.slice(2);
  return [phone628, `0${local}`, local];
}

export const INBOUND_MAX_CHARS = 1000;

/** Isi aktivitas lead untuk balasan masuk — dipotong supaya riwayat tetap ringkas. */
export function inboundActivityText(text: string): string {
  const t = text.trim().replace(/\s+\n/g, "\n");
  const cut = t.length > INBOUND_MAX_CHARS ? `${t.slice(0, INBOUND_MAX_CHARS)}…` : t;
  return `↩ Balasan WhatsApp: ${cut}`;
}

/** Isi aktivitas lead untuk pesan keluar lewat bot. */
export function outboundActivityText(templateTitle: string | null | undefined, body: string): string {
  const head = templateTitle ? `Kirim WA via bot — template "${templateTitle}"` : "Kirim WA via bot — pesan bebas";
  const snippet = body.trim().replace(/\s+/g, " ");
  return `${head}: ${snippet.length > 140 ? `${snippet.slice(0, 140)}…` : snippet}`;
}
