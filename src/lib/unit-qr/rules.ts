/**
 * Aturan MURNI untuk QR Pelanggan per bilik dan peringatan waktu di TV — tanpa db, tanpa jaringan,
 * tanpa membaca jam sendiri. Dipakai service (server), halaman /u/[token] (browser), dan scheduler;
 * diuji di rules.test.ts.
 *
 * Prinsip keamanan yang dijaga di sini: halaman pelanggan PUBLIK (bermodal token di stiker QR),
 * jadi semua yang datang dari HP pelanggan dianggap tidak tepercaya — divalidasi ketat, dibatasi
 * jumlahnya, dan tidak pernah langsung mengubah tagihan (kasir yang menyetujui). Harga tidak pernah
 * diambil dari HP; hanya productId + qty, harga dibaca ulang dari database saat kasir menerima.
 */

export const REQUEST_TYPES = ["order_fnb", "extend_time", "call_staff"] as const;
export type UnitRequestType = (typeof REQUEST_TYPES)[number];

export const EXTEND_OPTIONS = [30, 60, 90, 120] as const;
export const CALL_REASONS = ["bill", "controller", "help", "other"] as const;
export type CallReason = (typeof CALL_REASONS)[number];

export const MAX_ORDER_LINES = 15;
export const MAX_QTY_PER_LINE = 20;
export const MAX_NOTE_LENGTH = 140;
/** Permintaan yang masih menunggu per unit — di atas ini HP harus menunggu kasir menanggapi dulu. */
export const MAX_PENDING_PER_UNIT = 5;
/** Jeda minimum antar-permintaan berjenis sama dari satu unit (detik). */
export const SAME_TYPE_COOLDOWN_SECONDS = 20;
/** Lama layar "Waktu Habis" boleh tampil setelah sesi berakhir bila tagihan belum lunas (menit). */
export const TIME_UP_WINDOW_MINUTES = 15;

export type OrderPayload = { items: { productId: string; qty: number }[] };
export type ExtendPayload = { minutes: number };
export type CallPayload = { reason: CallReason; note: string | null };
export type RequestPayload = OrderPayload | ExtendPayload | CallPayload;

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** Token stiker QR: 24 karakter base62 acak (≈143 bit) — tidak bisa ditebak dari nama unit. */
export function generateQrToken(randomBytes: (n: number) => Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(48);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < 24; i++) {
    const b = bytes[i];
    if (b < 248) out += alphabet[b % 62]; // 248 = 62*4 → tanpa bias modulo
  }
  while (out.length < 24) out += alphabet[bytes[out.length % bytes.length] % 62];
  return out;
}

/** Bentuk token yang sah — menolak input aneh sebelum menyentuh database. */
export function isPlausibleToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9]{16,64}$/.test(token);
}

export function isRequestType(v: unknown): v is UnitRequestType {
  return typeof v === "string" && (REQUEST_TYPES as readonly string[]).includes(v);
}

/** Validasi isi permintaan dari HP. Mengembalikan payload bersih (bentuk pasti) atau pesan galat. */
export function validateRequestPayload(type: UnitRequestType, raw: unknown): ValidationResult<RequestPayload> {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  if (type === "order_fnb") {
    const items = Array.isArray(obj.items) ? obj.items : [];
    const merged = new Map<string, number>();
    for (const it of items) {
      const r = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
      const productId = typeof r.productId === "string" ? r.productId.trim() : "";
      const qty = Math.floor(Number(r.qty));
      if (!productId || productId.length > 64 || !Number.isFinite(qty) || qty < 1) continue;
      merged.set(productId, Math.min(MAX_QTY_PER_LINE, (merged.get(productId) ?? 0) + qty));
    }
    if (merged.size === 0) return { ok: false, error: "Pilih minimal satu menu." };
    if (merged.size > MAX_ORDER_LINES) return { ok: false, error: `Maksimal ${MAX_ORDER_LINES} jenis menu per pesanan.` };
    return { ok: true, value: { items: [...merged].map(([productId, qty]) => ({ productId, qty })) } };
  }
  if (type === "extend_time") {
    const minutes = Math.floor(Number(obj.minutes));
    if (!(EXTEND_OPTIONS as readonly number[]).includes(minutes)) return { ok: false, error: "Pilihan tambah waktu tidak dikenal." };
    return { ok: true, value: { minutes } };
  }
  const reason = typeof obj.reason === "string" && (CALL_REASONS as readonly string[]).includes(obj.reason) ? (obj.reason as CallReason) : "help";
  const noteRaw = typeof obj.note === "string" ? obj.note.replace(/\s+/g, " ").trim() : "";
  return { ok: true, value: { reason, note: noteRaw ? noteRaw.slice(0, MAX_NOTE_LENGTH) : null } };
}

export interface SubmitContext {
  type: UnitRequestType;
  /** Ada sesi berjalan/dijeda di unit ini sekarang. */
  hasActiveSession: boolean;
  orderEnabled: boolean;
  extendEnabled: boolean;
  /** Permintaan unit ini yang masih "pending". */
  pendingCount: number;
  /** Detik sejak permintaan TERAKHIR berjenis sama dari unit ini (null = belum pernah). */
  secondsSinceLastSameType: number | null;
}

/** Boleh tidaknya HP mengirim permintaan sekarang — urutan pemeriksaan menentukan pesan yang muncul. */
export function canSubmitRequest(ctx: SubmitContext): { ok: true } | { ok: false; error: string } {
  if (ctx.type === "order_fnb" && !ctx.orderEnabled) return { ok: false, error: "Pemesanan lewat QR dimatikan outlet ini. Silakan pesan ke kasir." };
  if (ctx.type === "extend_time" && !ctx.extendEnabled) return { ok: false, error: "Tambah waktu lewat QR dimatikan outlet ini. Silakan ke kasir." };
  if (ctx.type !== "call_staff" && !ctx.hasActiveSession) return { ok: false, error: "Unit ini sedang tidak dipakai. Mulai main dulu di kasir." };
  if (ctx.pendingCount >= MAX_PENDING_PER_UNIT) return { ok: false, error: "Masih ada permintaan yang menunggu kasir. Tunggu sebentar ya." };
  if (ctx.secondsSinceLastSameType !== null && ctx.secondsSinceLastSameType < SAME_TYPE_COOLDOWN_SECONDS) {
    return { ok: false, error: "Permintaan barusan sudah terkirim. Tunggu beberapa detik sebelum mengirim lagi." };
  }
  return { ok: true };
}

/**
 * Apakah peringatan sisa waktu perlu dikirim ke TV sekarang.
 * Dikirim sekali, saat sisa waktu masuk ke ambang (mis. ≤5 menit) — tapi TIDAK bila sisa waktu
 * tinggal <45 detik (scheduler sempat terlambat): memotong permainan sesaat sebelum habis hanya
 * mengganggu tanpa memberi waktu untuk bersiap.
 */
export function shouldSendTvWarning(remainingSeconds: number | null, thresholdMinutes: number, alreadySent: boolean): boolean {
  if (alreadySent || remainingSeconds === null) return false;
  const threshold = Math.max(1, Math.min(30, Math.floor(thresholdMinutes))) * 60;
  return remainingSeconds > 45 && remainingSeconds <= threshold;
}

/** Normalisasi setelan peringatan dari form (angka di luar rentang dijepit). */
export function clampWarningSettings(minutes: unknown, seconds: unknown): { minutes: number; seconds: number } {
  const m = Math.floor(Number(minutes));
  const s = Math.floor(Number(seconds));
  return {
    minutes: Number.isFinite(m) ? Math.max(1, Math.min(30, m)) : 5,
    seconds: Number.isFinite(s) ? Math.max(4, Math.min(20, s)) : 7,
  };
}

/**
 * Layar "WAKTU HABIS": tampil bila unit tidak punya sesi berjalan, sesi terakhirnya selesai dalam
 * TIME_UP_WINDOW_MINUTES terakhir, dan tagihannya masih terbuka (belum dibayar).
 */
export function isTimeUpActive(
  last: { status: string; endedAt: string | null } | null,
  billOpen: boolean,
  hasActiveSession: boolean,
  nowMs: number,
): boolean {
  if (hasActiveSession || !last || last.status !== "finished" || !last.endedAt || !billOpen) return false;
  const ended = new Date(last.endedAt).getTime();
  if (!Number.isFinite(ended)) return false;
  const age = nowMs - ended;
  return age >= 0 && age <= TIME_UP_WINDOW_MINUTES * 60_000;
}
