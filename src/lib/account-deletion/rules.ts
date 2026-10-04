import crypto from "crypto";

/**
 * Aturan murni penghapusan akun (Kebijakan Privasi bagian 8–9). Diuji di rules.test.ts.
 */

/** Data pribadi dihapus/dianonimkan paling lambat sekian hari setelah konfirmasi. */
export const PURGE_AFTER_DAYS = 30;
/** Masa berlaku kode konfirmasi email. */
export const CODE_TTL_MINUTES = 15;
/** Batas salah ketik kode sebelum harus minta kode baru. */
export const MAX_CODE_ATTEMPTS = 5;
/** Teks yang harus diketik Owner di dialog konfirmasi (mencegah salah klik). */
export const CONFIRM_PHRASE = "HAPUS";

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me-in-.env";

export function generateDeletionCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashDeletionCode(requestId: string, code: string): string {
  return crypto.createHmac("sha256", SECRET).update(`${requestId}:${code.trim()}`).digest("hex");
}

export function isValidCodeFormat(code: unknown): code is string {
  return typeof code === "string" && /^\d{6}$/.test(code.trim());
}

/** Bandingkan kode dengan hash tersimpan (timing-safe) dan cek kedaluwarsa. */
export function checkDeletionCode(params: { requestId: string; code: string; codeHash: string | null; codeExpiresAt: string | null; attempts: number; now?: Date }):
  | { ok: true }
  | { ok: false; reason: "expired" | "too_many_attempts" | "wrong_code" | "no_code" } {
  if (!params.codeHash || !params.codeExpiresAt) return { ok: false, reason: "no_code" };
  if (params.attempts >= MAX_CODE_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (new Date(params.codeExpiresAt).getTime() <= (params.now ?? new Date()).getTime()) return { ok: false, reason: "expired" };
  const a = Buffer.from(hashDeletionCode(params.requestId, params.code), "hex");
  const b = Buffer.from(params.codeHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: "wrong_code" };
  return { ok: true };
}

export function addMinutesIso(from: Date, minutes: number): string {
  return new Date(from.getTime() + minutes * 60_000).toISOString();
}

export function purgeDueAt(confirmedAt: Date): string {
  return new Date(confirmedAt.getTime() + PURGE_AFTER_DAYS * 86_400_000).toISOString();
}

export function isPurgeDue(scheduledPurgeAt: string | null, now: Date = new Date()): boolean {
  return !!scheduledPurgeAt && new Date(scheduledPurgeAt).getTime() <= now.getTime();
}

/** Email pengganti yang unik per akun setelah dianonimkan (kolom email unik & wajib diisi). */
export function anonymizedEmail(staffUserId: string): string {
  return `deleted+${staffUserId}@deleted.nexbill.id`;
}

/** "andi@gmail.com" → "an***@gmail.com" untuk ditampilkan/disimpan setelah purge. */
export function maskEmail(email: string): string {
  const [user, domain] = String(email).split("@");
  if (!domain) return "***";
  return `${user.slice(0, 2)}***@${domain}`;
}

export function parseIdList(json: string | null | undefined): string[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
  } catch {
    return [];
  }
}
