import crypto from "crypto";
import { eq, and, or, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { platformTuyaAccount, outlets, devices } from "@/db/schema";
import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";

/**
 * Real Tuya IoT Platform (cloud.tuya.com) OpenAPI v1.0 adapter — HMAC-SHA256 signed requests per
 * Tuya's official signing spec.
 *
 * Credentials resolution (changed 2026-09-15 — see outlets.tuyaAccessId's doc comment in
 * schema.ts): every outlet is looked up first for its OWN Access ID/Secret/region — this is now
 * required for any NEW outlet using the "tuya" protocol, so each merchant owns its own Tuya
 * subscription risk (Trial expiry, the 10-controllable-device cap) instead of pooling it onto one
 * shared account for the whole platform. Only if the outlet has no credentials of its own AND is
 * explicitly flagged `tuyaUseSharedPlatformAccount` (a platform-admin-only exception — currently
 * just the legacy "Xtream Playstation" outlet, already running on the old shared account) does
 * this fall back to the single `platformTuyaAccount` row set from /platform-admin/tuya. Any other
 * outlet with neither gets a clear error telling it to set up its own Tuya Cloud API.
 *
 * Either way, an outlet only ever stores its own device's Tuya `deviceId` (and optionally a
 * non-default DP switch code) in `devices.config` as JSON: { "deviceId": "...", "switchCode": "switch_1" }.
 */

// Matches Tuya IoT Platform's actual data center endpoints. The region picked
// in Settings must be whichever data center the outlet's Tuya app account/
// Cloud Project actually lives in (see cloud.tuya.com > OEM App > Map Account
// to Data Center) — the wrong one means every request 401s even with
// correct credentials.
const REGION_BASE_URL: Record<string, string> = {
  cn: "https://openapi.tuyacn.com", // China Data Center
  us: "https://openapi.tuyaus.com", // Western America Data Center
  us_e: "https://openapi-ueaz.tuyaus.com", // Eastern America Data Center
  eu: "https://openapi.tuyaeu.com", // Central Europe Data Center
  eu_w: "https://openapi-weaz.tuyaeu.com", // Western Europe Data Center
  in: "https://openapi.tuyain.com", // India Data Center
  sg: "https://openapi-sg.iotbing.com", // Singapore Data Center
};

interface TuyaCreds {
  accessId: string;
  accessSecret: string;
  baseUrl: string;
}

// Bounded so a Tuya API hiccup fails fast instead of hanging the whole start/stop/transfer
// session request — this shared cloud account is used by every outlet, so a slow response here
// used to directly delay every cashier's checkout, not just this one outlet's.
const TUYA_TIMEOUT_MS = 5000;

interface TuyaDeviceConfig {
  deviceId?: string;
  switchCode?: string;
}

function parseConfig(device: DeviceRecord): TuyaDeviceConfig {
  if (!device.config) return {};
  try {
    return JSON.parse(device.config);
  } catch {
    return {};
  }
}

/** Get-or-create the single platformTuyaAccount row — same "exactly one row, lazily created" pattern as ensureDefaultPlan() for subscriptionPlans. Used by /api/platform-admin/tuya to always have a row to read/edit. */
export async function getOrCreatePlatformTuyaAccount() {
  const [existing] = await db.select().from(platformTuyaAccount).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(platformTuyaAccount).values({}).returning();
  return created;
}

/**
 * Guardrail against silently exceeding the shared account's real Tuya-side device cap (added
 * 2026-09-15). Every outlet flagged `tuyaUseSharedPlatformAccount` (and without its own
 * credentials — see getCreds() below) draws from the SAME Tuya Cloud Project. Without this check,
 * several such outlets could each add a couple of Tuya plugs and quietly sail past Tuya's real
 * "controllable devices" ceiling (10 on Trial) with zero warning until one of them just fails to
 * connect — a confusing, hard-to-diagnose support ticket instead of a clear message at the moment
 * the device is added. Only ever relevant for the legacy shared-account exception; an outlet on
 * its own Tuya Cloud API is never subject to this (that's the whole point of the per-outlet
 * model — see the doc comment at the top of this file).
 *
 * Call BEFORE inserting/updating a device to "tuya" — throws instead of letting it through, so
 * the failure surfaces as a normal form validation error, not a Tuya API 400 three steps later.
 */
export async function assertSharedTuyaCapacityAvailable(outletId: string, excludeDeviceId?: string): Promise<void> {
  const [outlet] = await db
    .select({ tuyaAccessId: outlets.tuyaAccessId, tuyaAccessSecret: outlets.tuyaAccessSecret, tuyaUseSharedPlatformAccount: outlets.tuyaUseSharedPlatformAccount })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);

  // Not on the shared pool at all (own credentials, or no exception flag) — nothing to guard.
  if (!outlet?.tuyaUseSharedPlatformAccount) return;
  if (outlet.tuyaAccessId && outlet.tuyaAccessSecret) return;

  const account = await getOrCreatePlatformTuyaAccount();
  const conditions = [
    eq(devices.protocol, "tuya"),
    eq(outlets.tuyaUseSharedPlatformAccount, true),
    or(isNull(outlets.tuyaAccessId), eq(outlets.tuyaAccessId, "")),
  ];
  if (excludeDeviceId) conditions.push(ne(devices.id, excludeDeviceId));
  const rows = await db
    .select({ id: devices.id })
    .from(devices)
    .innerJoin(outlets, eq(devices.outletId, outlets.id))
    .where(and(...conditions));

  const usedCount = rows.length;
  if (usedCount >= account.maxControllableDevices) {
    throw new Error(
      `Kapasitas akun Tuya Cloud API bersama sudah penuh (${usedCount}/${account.maxControllableDevices} device, dipakai bersama beberapa outlet legacy). Tidak bisa menambah device Tuya baru lewat akun bersama ini — hubungi Customer Service NEXBILL untuk pindah ke akun Tuya Cloud API milik outlet sendiri (tanpa batas berbagi), atau minta platform-admin menaikkan kapasitas akun bersama (upgrade tier Tuya).`
    );
  }
}

async function getCreds(outletId: string): Promise<TuyaCreds> {
  const [outlet] = await db
    .select({
      tuyaAccessId: outlets.tuyaAccessId,
      tuyaAccessSecret: outlets.tuyaAccessSecret,
      tuyaRegion: outlets.tuyaRegion,
      tuyaUseSharedPlatformAccount: outlets.tuyaUseSharedPlatformAccount,
    })
    .from(outlets)
    .where(eq(outlets.id, outletId))
    .limit(1);

  if (outlet?.tuyaAccessId && outlet.tuyaAccessSecret) {
    return { accessId: outlet.tuyaAccessId, accessSecret: outlet.tuyaAccessSecret, baseUrl: REGION_BASE_URL[outlet.tuyaRegion] ?? REGION_BASE_URL.sg };
  }

  if (outlet?.tuyaUseSharedPlatformAccount) {
    const [row] = await db.select().from(platformTuyaAccount).limit(1);
    if (!row?.accessId || !row?.accessSecret) {
      throw new Error("Tuya Cloud API bersama belum dikonfigurasi di platform-admin — hubungi NEXBILL.");
    }
    return { accessId: row.accessId, accessSecret: row.accessSecret, baseUrl: REGION_BASE_URL[row.region] ?? REGION_BASE_URL.sg };
  }

  throw new Error(
    "Outlet ini belum mengatur Tuya Cloud API sendiri. Setiap outlet wajib punya akun Tuya Cloud API sendiri (Access ID/Secret) — atur di Pengaturan > Integrasi Tuya Cloud API."
  );
}

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
    throw new Error(`Tuya token gagal (${data.code}): ${data.msg ?? "unknown error"} — cek Access ID/Secret & region.`);
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
    throw new Error(`Tuya API gagal (${data.code}): ${data.msg ?? "unknown error"}`);
  }
  return data.result;
}

async function setSwitch(device: DeviceRecord, on: boolean) {
  const cfg = parseConfig(device);
  if (!cfg.deviceId) {
    throw new Error(`Device "${device.name}" belum diisi Tuya Device ID.`);
  }
  const creds = await getCreds(device.outletId);
  const code = cfg.switchCode || "switch_1";
  await tuyaRequest(creds, "POST", `/v1.0/iot-03/devices/${cfg.deviceId}/commands`, {
    commands: [{ code, value: on }],
  });
}

export const tuyaAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    await setSwitch(device, true);
  },
  async turnOff(device: DeviceRecord) {
    await setSwitch(device, false);
  },
  async getState(device: DeviceRecord): Promise<DevicePowerState> {
    const cfg = parseConfig(device);
    if (!cfg.deviceId) return "unknown";
    try {
      const creds = await getCreds(device.outletId);
      const code = cfg.switchCode || "switch_1";
      const status: { code: string; value: unknown }[] = await tuyaRequest(creds, "GET", `/v1.0/iot-03/devices/${cfg.deviceId}/status`);
      const entry = status.find((s) => s.code === code);
      if (!entry) return "unknown";
      return entry.value ? "on" : "off";
    } catch {
      return "unknown";
    }
  },
};
