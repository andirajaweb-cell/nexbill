/**
 * Logika murni (tanpa DB/jaringan) untuk fitur beberapa akun Tuya Cloud API per outlet.
 * Dipakai adapter Tuya, API Pengaturan, API perangkat, dan UI — diuji di tuya-accounts.test.ts.
 */

export const TUYA_REGIONS = ["sg", "cn", "us", "us_e", "eu", "eu_w", "in"] as const;
export type TuyaRegion = (typeof TUYA_REGIONS)[number];

/**
 * Perkiraan batas perangkat yang bisa dikontrol satu akun Tuya Cloud API gratis (Trial). Tuya
 * tidak konsisten (sebagian akun 8, sebagian 10), jadi dipakai angka terkecil sebagai ambang
 * peringatan — bukan batas keras; akun berbayar bisa jauh lebih banyak.
 */
export const TUYA_TRIAL_DEVICE_LIMIT = 8;

export interface TuyaDeviceConfig {
  deviceId?: string;
  switchCode?: string;
  /** id baris outlet_tuya_accounts yang dipakai perangkat ini. Kosong = akun pertama / dicari otomatis. */
  accountId?: string;
}

export function parseTuyaConfig(config: string | null | undefined): TuyaDeviceConfig {
  if (!config) return {};
  try {
    const v = JSON.parse(config);
    if (!v || typeof v !== "object") return {};
    const out: TuyaDeviceConfig = {};
    if (typeof v.deviceId === "string" && v.deviceId.trim()) out.deviceId = v.deviceId.trim();
    if (typeof v.switchCode === "string" && v.switchCode.trim()) out.switchCode = v.switchCode.trim();
    if (typeof v.accountId === "string" && v.accountId.trim()) out.accountId = v.accountId.trim();
    return out;
  } catch {
    return {};
  }
}

/** Gabungkan perubahan ke config JSON yang ada tanpa membuang kunci lain. */
export function mergeTuyaConfig(config: string | null | undefined, patch: { [K in keyof TuyaDeviceConfig]?: string | null }): string {
  let base: Record<string, unknown> = {};
  if (config) {
    try {
      const v = JSON.parse(config);
      if (v && typeof v === "object" && !Array.isArray(v)) base = v;
    } catch {
      /* config rusak: mulai dari kosong */
    }
  }
  const next: Record<string, unknown> = { ...base };
  // undefined = biarkan nilai lama; null/"" = hapus kunci.
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    if (v === null || v === "") delete next[k];
    else next[k] = v;
  }
  return JSON.stringify(next);
}

/** Tampilkan secret seperti "••••••••ab12" — secret asli tidak pernah dikirim ke browser. */
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return "";
  const tail = secret.length > 4 ? secret.slice(-4) : "";
  return "••••••••" + tail;
}

export interface AccountRef {
  id: string;
  sortOrder: number;
  createdAt: string;
}

/** Urutan resmi akun: sort_order lalu tanggal dibuat. Akun pertama = akun bawaan perangkat lama. */
export function sortAccounts<T extends AccountRef>(accounts: T[]): T[] {
  return [...accounts].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Akun yang dipakai sebuah perangkat: akun yang tersimpan di config kalau masih ada, selain itu
 * akun pertama. null kalau outlet belum punya akun sama sekali.
 */
export function pickAccountForDevice<T extends AccountRef>(accounts: T[], cfg: TuyaDeviceConfig): T | null {
  if (accounts.length === 0) return null;
  if (cfg.accountId) {
    const found = accounts.find((a) => a.id === cfg.accountId);
    if (found) return found;
  }
  return sortAccounts(accounts)[0];
}

/**
 * Urutan akun yang dicoba saat mencari pemilik Device ID: akun yang sedang dipakai dulu, lalu
 * sisanya berurutan. Tanpa duplikat.
 */
export function accountsToProbe<T extends AccountRef>(accounts: T[], preferredId?: string): T[] {
  const sorted = sortAccounts(accounts);
  if (!preferredId) return sorted;
  const pref = sorted.find((a) => a.id === preferredId);
  return pref ? [pref, ...sorted.filter((a) => a.id !== preferredId)] : sorted;
}

/**
 * Kode galat Tuya yang berarti "perangkat ini bukan milik akun ini" (bukan galat jaringan /
 * kredensial) — hanya untuk kode-kode ini sistem mencoba akun lain.
 *  1106 permission deny · 2009 device not belong to project · 1100/1109 param illegal
 *  2001/2002 device not found · 1004 sign invalid tidak termasuk (itu masalah kredensial).
 */
const NOT_OWNED_CODES = new Set([1106, 1100, 1109, 2001, 2002, 2009, 2017]);
export function isNotOwnedError(code: unknown): boolean {
  const n = typeof code === "string" ? Number(code) : code;
  return typeof n === "number" && NOT_OWNED_CODES.has(n);
}

/** Jumlah perangkat Tuya per akun (perangkat tanpa accountId dihitung ke akun pertama). */
export function countDevicesPerAccount<T extends AccountRef>(
  accounts: T[],
  devices: { protocol: string; config: string | null }[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of accounts) counts[a.id] = 0;
  for (const d of devices) {
    if (d.protocol !== "tuya") continue;
    const acc = pickAccountForDevice(accounts, parseTuyaConfig(d.config));
    if (acc) counts[acc.id] = (counts[acc.id] ?? 0) + 1;
  }
  return counts;
}

export interface TuyaAccountInput {
  label?: unknown;
  accessId?: unknown;
  accessSecret?: unknown;
  projectCode?: unknown;
  region?: unknown;
}

export interface CleanTuyaAccount {
  label: string;
  accessId: string;
  accessSecret: string | null; // null = tidak diubah (hanya saat edit)
  projectCode: string | null;
  region: TuyaRegion;
}

/** Validasi input form akun. `isNew` mewajibkan secret; saat edit secret kosong = tetap. */
export function validateTuyaAccountInput(input: TuyaAccountInput, isNew: boolean, fallbackLabel: string): CleanTuyaAccount {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const label = str(input.label) || fallbackLabel;
  const accessId = str(input.accessId);
  const secret = str(input.accessSecret);
  const region = str(input.region) || "sg";
  if (!accessId) throw new Error("Access ID wajib diisi.");
  if (isNew && !secret) throw new Error("Access Secret wajib diisi.");
  if (!(TUYA_REGIONS as readonly string[]).includes(region)) throw new Error("Region Tuya tidak dikenal.");
  if (label.length > 60) throw new Error("Nama akun maksimal 60 karakter.");
  return { label, accessId, accessSecret: secret || null, projectCode: str(input.projectCode) || null, region: region as TuyaRegion };
}
