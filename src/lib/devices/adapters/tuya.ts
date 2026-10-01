import crypto from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { devices, outlets, outletTuyaAccounts } from "@/db/schema";
import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";
import {
  accountsToProbe,
  isNotOwnedError,
  mergeTuyaConfig,
  parseTuyaConfig,
  pickAccountForDevice,
  sortAccounts,
} from "../tuya-accounts";

/**
 * Real Tuya IoT Platform (cloud.tuya.com) OpenAPI v1.0 adapter — HMAC-SHA256 signed requests per
 * Tuya's official signing spec.
 *
 * Credentials (2026-10-02, migrasi 0027): setiap outlet bisa punya BEBERAPA akun Tuya Cloud API
 * (tabel outlet_tuya_accounts), karena akun Trial Tuya hanya bisa mengontrol sedikit perangkat
 * (sekitar 8–10). Tiap perangkat menyimpan akun yang dipakainya di devices.config.accountId:
 *   { "deviceId": "...", "switchCode": "switch_1", "accountId": "<outlet_tuya_accounts.id>" }
 * Perangkat lama tanpa accountId memakai akun pertama. Kalau Tuya menjawab "perangkat bukan milik
 * akun ini", akun lain dicoba satu per satu dan akun yang cocok langsung disimpan ke config, jadi
 * percobaan ulang hanya terjadi sekali per perangkat.
 *
 * Sebelum 2026-10-02 kredensial ada di kolom outlets.tuya_access_id/secret/region (satu akun).
 * Migrasi 0027 menyalinnya jadi "Akun 1"; kalau outlet belum punya baris akun sama sekali, kolom
 * lama tetap dipakai sebagai cadangan (id virtual "legacy").
 */

// Matches Tuya IoT Platform's actual data center endpoints. The region picked must be whichever
// data center the Tuya app account/Cloud Project actually lives in — the wrong one means every
// request 401s even with correct credentials.
const REGION_BASE_URL: Record<string, string> = {
  cn: "https://openapi.tuyacn.com", // China Data Center
  us: "https://openapi.tuyaus.com", // Western America Data Center
  us_e: "https://openapi-ueaz.tuyaus.com", // Eastern America Data Center
  eu: "https://openapi.tuyaeu.com", // Central Europe Data Center
  eu_w: "https://openapi-weaz.tuyaeu.com", // Western Europe Data Center
  in: "https://openapi.tuyain.com", // India Data Center
  sg: "https://openapi-sg.iotbing.com", // Singapore Data Center
};

const LEGACY_ACCOUNT_ID = "legacy";

interface TuyaCreds {
  accessId: string;
  accessSecret: string;
  baseUrl: string;
}

export interface TuyaAccountRow {
  id: string;
  label: string;
  accessId: string;
  accessSecret: string;
  region: string;
  sortOrder: number;
  createdAt: string;
}

/** Galat dari API Tuya, membawa kode Tuya supaya bisa dibedakan "bukan milik akun ini" vs kredensial. */
export class TuyaApiError extends Error {
  constructor(message: string, readonly code: unknown) {
    super(message);
    this.name = "TuyaApiError";
  }
}

// Bounded so a Tuya API hiccup fails fast instead of hanging the whole start/stop/transfer
// session request.
const TUYA_TIMEOUT_MS = 5000;

function credsOf(acc: TuyaAccountRow): TuyaCreds {
  return { accessId: acc.accessId, accessSecret: acc.accessSecret, baseUrl: REGION_BASE_URL[acc.region] ?? REGION_BASE_URL.sg };
}

/** Semua akun Tuya outlet, urut. Cadangan: kolom lama di outlets bila belum ada baris akun. */
export async function loadTuyaAccounts(outletId: string): Promise<TuyaAccountRow[]> {
  const rows = await db
    .select({
      id: outletTuyaAccounts.id,
      label: outletTuyaAccounts.label,
      accessId: outletTuyaAccounts.accessId,
      accessSecret: outletTuyaAccounts.accessSecret,
      region: outletTuyaAccounts.region,
      sortOrder: outletTuyaAccounts.sortOrder,
      createdAt: outletTuyaAccounts.createdAt,
    })
    .from(outletTuyaAccounts)
    .where(eq(outletTuyaAccounts.outletId, outletId));
  if (rows.length > 0) return sortAccounts(rows);

  const [outlet] = await db
    .select({ tuyaAccessId: outlets.tuyaAccessId, tuyaAccessSecret: outlets.tuyaAccessSecret, tuyaRegion: outlets.tuyaRegion })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);
  if (outlet?.tuyaAccessId && outlet.tuyaAccessSecret) {
    return [{ id: LEGACY_ACCOUNT_ID, label: "Akun 1", accessId: outlet.tuyaAccessId, accessSecret: outlet.tuyaAccessSecret, region: outlet.tuyaRegion, sortOrder: 0, createdAt: "" }];
  }
  return [];
}

const NO_ACCOUNT_MESSAGE =
  "Outlet ini belum mengatur akun Tuya Cloud API. Tambahkan akun (Access ID/Secret) di Pengaturan > Business & Tax > Integrasi Tuya Cloud API.";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function hmacSha256Hex(key: string, input: string): string {
  return crypto.createHmac("sha256", key).update(input, "utf8").digest("hex").toUpperCase();
}

/** Tuya's "stringToSign" construction — same shape for both the token request and every business request. */
function buildStringToSign(method: string, urlPath: string, body: string): string {
  const contentHash = sha256Hex(body || "");
  return `${method}\n${contentHash}\n\n${urlPath}`;
}

// In-memory access-token cache, keyed by accessId — Tuya tokens last ~2h, no need to fetch one per call.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(creds: TuyaCreds): Promise<string> {
  const cached = tokenCache.get(creds.accessId);
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;

  const t = Date.now().toString();
  const urlPath = "/v1.0/token?grant_type=1";
  const stringToSign = buildStringToSign("GET", urlPath, "");
  const sign = hmacSha256Hex(creds.accessSecret, creds.accessId + t + stringToSign);

  const res = await fetch(creds.baseUrl + urlPath, {
    method: "GET",
    headers: {
      client_id: creds.accessId,
      sign,
      t,
      sign_method: "HMAC-SHA256",
    },
    signal: AbortSignal.timeout(TUYA_TIMEOUT_MS),
  });
  const data = await res.json();
  if (!data.success) {
    throw new TuyaApiError(`Tuya token gagal (${data.code}): ${data.msg ?? "unknown error"} — cek Access ID/Secret & region.`, data.code);
  }
  const token = data.result.access_token as string;
  const expiresAt = Date.now() + (data.result.expire_time ?? 7200) * 1000;
  tokenCache.set(creds.accessId, { token, expiresAt });
  return token;
}

async function tuyaRequest(creds: TuyaCreds, method: "GET" | "POST", urlPath: string, body?: unknown) {
  const token = await getAccessToken(creds);
  const t = Date.now().toString();
  const bodyStr = body ? JSON.stringify(body) : "";
  const stringToSign = buildStringToSign(method, urlPath, bodyStr);
  const sign = hmacSha256Hex(creds.accessSecret, creds.accessId + token + t + stringToSign);

  const res = await fetch(creds.baseUrl + urlPath, {
    method,
    headers: {
      client_id: creds.accessId,
      access_token: token,
      sign,
      t,
      sign_method: "HMAC-SHA256",
      "Content-Type": "application/json",
    },
    body: bodyStr || undefined,
    signal: AbortSignal.timeout(TUYA_TIMEOUT_MS),
  });
  const data = await res.json();
  if (!data.success) {
    throw new TuyaApiError(`Tuya API gagal (${data.code}): ${data.msg ?? "unknown error"}`, data.code);
  }
  return data.result;
}

/** Simpan akun yang ternyata memiliki perangkat ini, supaya berikutnya langsung tepat. */
async function rememberAccount(device: DeviceRecord, accountId: string) {
  if (accountId === LEGACY_ACCOUNT_ID) return;
  try {
    const [row] = await db.select({ config: devices.config }).from(devices).where(and(eq(devices.id, device.id), eq(devices.outletId, device.outletId))).limit(1);
    if (!row) return;
    await db.update(devices).set({ config: mergeTuyaConfig(row.config, { accountId }) }).where(eq(devices.id, device.id));
  } catch {
    /* hanya optimasi — gagal simpan tidak boleh menggagalkan kontrol perangkat */
  }
}

/**
 * Jalankan aksi dengan akun milik perangkat. Kalau Tuya bilang perangkat bukan milik akun itu dan
 * outlet punya akun lain, coba akun lain lalu ingat akun yang berhasil.
 */
async function withDeviceAccount<T>(device: DeviceRecord, action: (creds: TuyaCreds) => Promise<T>): Promise<T> {
  const accounts = await loadTuyaAccounts(device.outletId);
  if (accounts.length === 0) throw new Error(NO_ACCOUNT_MESSAGE);
  const cfg = parseTuyaConfig(device.config);
  const first = pickAccountForDevice(accounts, cfg)!;
  const ordered = accountsToProbe(accounts, first.id);

  let lastErr: unknown = null;
  for (let i = 0; i < ordered.length; i++) {
    const acc = ordered[i];
    try {
      const result = await action(credsOf(acc));
      if (acc.id !== cfg.accountId) await rememberAccount(device, acc.id);
      return result;
    } catch (err) {
      lastErr = err;
      const notOwned = err instanceof TuyaApiError && isNotOwnedError(err.code);
      if (!notOwned) break; // galat kredensial/jaringan: jangan coba akun lain
    }
  }
  if (accounts.length > 1 && lastErr instanceof TuyaApiError && isNotOwnedError(lastErr.code)) {
    throw new Error(`Device ID "${cfg.deviceId}" tidak ditemukan di akun Tuya mana pun milik outlet ini. Pastikan smart plug sudah ditautkan ke salah satu akun Tuya Cloud (Devices > Link App Account).`);
  }
  throw lastErr instanceof Error ? lastErr : new Error("Gagal menghubungi Tuya Cloud API.");
}

/**
 * Cari akun Tuya outlet yang memiliki Device ID ini (dipakai saat menyimpan perangkat dengan
 * pilihan akun "Otomatis"). Mengembalikan id akun, atau null bila tidak ada yang cocok.
 * `error` diisi kalau ada akun yang gagal karena kredensial/jaringan (bukan "bukan milik").
 */
export async function findTuyaAccountForDevice(outletId: string, deviceId: string): Promise<{ accountId: string | null; label?: string; error?: string }> {
  const accounts = await loadTuyaAccounts(outletId);
  if (accounts.length === 0) return { accountId: null, error: NO_ACCOUNT_MESSAGE };
  const errors: string[] = [];
  for (const acc of accounts) {
    try {
      await tuyaRequest(credsOf(acc), "GET", `/v1.0/iot-03/devices/${encodeURIComponent(deviceId)}/status`);
      return { accountId: acc.id === LEGACY_ACCOUNT_ID ? null : acc.id, label: acc.label };
    } catch (err) {
      if (!(err instanceof TuyaApiError && isNotOwnedError(err.code))) {
        errors.push(`${acc.label}: ${err instanceof Error ? err.message : "gagal"}`);
      }
    }
  }
  return { accountId: null, error: errors.length ? errors.join(" · ") : undefined };
}

/**
 * Tes koneksi satu akun — benar-benar meminta access token baru ke Tuya (bypass tokenCache),
 * karena kredensial bisa tersimpan tapi salah (typo, region salah, Trial habis).
 */
export async function testTuyaAccount(outletId: string, accountId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const accounts = await loadTuyaAccounts(outletId);
    const acc = accounts.find((a) => a.id === accountId);
    if (!acc) return { ok: false, message: "Akun Tuya tidak ditemukan." };
    const creds = credsOf(acc);
    tokenCache.delete(creds.accessId);
    await getAccessToken(creds);
    return { ok: true, message: "Terhubung ke Tuya Cloud API." };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Gagal terhubung ke Tuya Cloud API." };
  }
}

/** Tes semua akun outlet sekaligus (dipakai endpoint lama /api/settings/outlet/test-tuya). */
export async function testTuyaConnection(outletId: string): Promise<{ ok: boolean; message: string }> {
  const accounts = await loadTuyaAccounts(outletId);
  if (accounts.length === 0) return { ok: false, message: NO_ACCOUNT_MESSAGE };
  const failed: string[] = [];
  for (const acc of accounts) {
    const r = await testTuyaAccount(outletId, acc.id);
    if (!r.ok) failed.push(`${acc.label}: ${r.message}`);
  }
  return failed.length ? { ok: false, message: failed.join(" · ") } : { ok: true, message: "Semua akun Tuya terhubung." };
}

/** Hapus token tersimpan sebuah Access ID (setelah kredensial diubah). */
export function forgetTuyaToken(accessId: string) {
  tokenCache.delete(accessId);
}

async function setSwitch(device: DeviceRecord, on: boolean) {
  const cfg = parseTuyaConfig(device.config);
  if (!cfg.deviceId) {
    throw new Error(`Device "${device.name}" belum diisi Tuya Device ID.`);
  }
  const code = cfg.switchCode || "switch_1";
  await withDeviceAccount(device, (creds) =>
    tuyaRequest(creds, "POST", `/v1.0/iot-03/devices/${cfg.deviceId}/commands`, {
      commands: [{ code, value: on }],
    }),
  );
}

export const tuyaAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    await setSwitch(device, true);
  },
  async turnOff(device: DeviceRecord) {
    await setSwitch(device, false);
  },
  async getState(device: DeviceRecord): Promise<DevicePowerState> {
    const cfg = parseTuyaConfig(device.config);
    if (!cfg.deviceId) return "unknown";
    try {
      const code = cfg.switchCode || "switch_1";
      const status: { code: string; value: unknown }[] = await withDeviceAccount(device, (creds) =>
        tuyaRequest(creds, "GET", `/v1.0/iot-03/devices/${cfg.deviceId}/status`),
      );
      const entry = status.find((s) => s.code === code);
      if (!entry) return "unknown";
      return entry.value ? "on" : "off";
    } catch {
      return "unknown";
    }
  },
};
