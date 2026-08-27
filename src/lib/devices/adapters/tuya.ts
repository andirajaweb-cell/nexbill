import crypto from "crypto";
import { db } from "@/db/client";
import { platformTuyaAccount } from "@/db/schema";
import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";

/**
 * Real Tuya IoT Platform (cloud.tuya.com) OpenAPI v1.0 adapter — HMAC-SHA256 signed requests per
 * Tuya's official signing spec. Credentials (Access ID/Secret + region) live in the SINGLE
 * `platformTuyaAccount` row (see schema.ts) — one shared Cloud Project used to control devices
 * for every outlet/merchant across every country, set from /platform-admin/tuya. NOT scoped to
 * an outlet, NOT hardcoded here — an outlet only ever stores its own device's Tuya `deviceId`
 * (and optionally a non-default DP switch code) in `devices.config` as JSON:
 * { "deviceId": "...", "switchCode": "switch_1" }; the account that talks to Tuya's API is
 * always this one shared account.
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

async function getCreds(): Promise<TuyaCreds> {
  const [row] = await db.select().from(platformTuyaAccount).limit(1);
  if (!row?.accessId || !row?.accessSecret) {
    throw new Error("Tuya Cloud API belum diatur — hubungi NEXBILL, akun Tuya Cloud API bersama belum dikonfigurasi di platform-admin.");
  }
  return { accessId: row.accessId, accessSecret: row.accessSecret, baseUrl: REGION_BASE_URL[row.region] ?? REGION_BASE_URL.sg };
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
  const creds = await getCreds();
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
      const creds = await getCreds();
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
