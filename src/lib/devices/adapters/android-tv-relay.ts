import { DeviceAdapter, DeviceRecord, DevicePowerState } from "../types";
import { db } from "@/db/client";
import { relayAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { RELAY_HTTP_PORT, RELAY_HUB_DISPATCH_URL, RELAY_HUB_DISPATCH_SECRET, RelayDispatchRequest, RelayDispatchResponse } from "@/lib/relay/config";

/**
 * Android TV control via the Relay Agent — for when the Next.js app is NOT
 * on the same local network as the TV (e.g. cloud-hosted). Talks to the
 * relay hub (scripts/relay-hub.ts, a separate always-on process), which
 * forwards the command over an already-open WebSocket to the outlet's Relay
 * Agent (scripts/relay-agent.ts), which runs the actual `adb` command
 * locally and reports back.
 *
 * Device config JSON (set via the Devices page):
 *   { "relayAgentId": "<id of a row in relay_agents>", "ip": "192.168.1.50", "port": 5555, "adbPath": "adb" }
 *
 * Contrast with adapters/android-tv.ts, which shells out to `adb` directly
 * on this server — the simpler option when self-hosted at the outlet.
 *
 * Where the hub is depends on where THIS app runs (see src/lib/relay/config.ts
 * for the full explanation):
 *  - Same server as the hub (default): dispatches to plain http://127.0.0.1.
 *  - Separate server (e.g. this app on Vercel, hub on its own VPS): set
 *    RELAY_HUB_DISPATCH_URL (the hub's public https URL, behind a reverse
 *    proxy) and RELAY_HUB_DISPATCH_SECRET (must match the hub's env) on this
 *    app's environment — dispatch() then uses those instead.
 */

interface RelayDeviceConfig {
  relayAgentId?: string;
  ip?: string;
  port?: number;
  adbPath?: string;
}

function parseConfig(device: DeviceRecord): RelayDeviceConfig {
  if (!device.config) return {};
  try {
    return JSON.parse(device.config);
  } catch {
    return {};
  }
}

async function dispatch(device: DeviceRecord, action: "turnOn" | "turnOff" | "getState"): Promise<RelayDispatchResponse> {
  const cfg = parseConfig(device);
  if (!cfg.relayAgentId) throw new Error(`Device "${device.name}" belum dipasangkan ke Relay Agent.`);
  if (!cfg.ip) throw new Error(`Device "${device.name}" belum diisi alamat IP TV.`);

  const [agent] = await db.select().from(relayAgents).where(eq(relayAgents.id, cfg.relayAgentId)).limit(1);
  if (!agent) throw new Error(`Relay Agent untuk device "${device.name}" tidak ditemukan (mungkin sudah dihapus).`);
  if (agent.outletId !== device.outletId) {
    throw new Error(`Relay Agent untuk device "${device.name}" terdaftar di outlet lain.`);
  }

  const body: RelayDispatchRequest = {
    relayAgentToken: agent.token,
    action,
    ip: cfg.ip,
    port: cfg.port || 5555,
    adbPath: cfg.adbPath,
  };

  const dispatchUrl = RELAY_HUB_DISPATCH_URL || `http://127.0.0.1:${RELAY_HTTP_PORT}/dispatch`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (RELAY_HUB_DISPATCH_SECRET) headers["Authorization"] = `Bearer ${RELAY_HUB_DISPATCH_SECRET}`;

  let res: Response;
  try {
    res = await fetch(dispatchUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      RELAY_HUB_DISPATCH_URL
        ? `Tidak bisa menghubungi Relay Hub di ${dispatchUrl}. Pastikan proses "npm run relay:hub" berjalan di server tersebut dan bisa diakses publik.`
        : `Tidak bisa menghubungi Relay Hub di server ini (port ${RELAY_HTTP_PORT}). Pastikan proses "npm run relay:hub" sedang berjalan. Kalau app ini dan Relay Hub berada di server yang berbeda (mis. app di Vercel), set env RELAY_HUB_DISPATCH_URL.`
    );
  }
  if (res.status === 401) {
    throw new Error("Relay Hub menolak permintaan (401) — RELAY_HUB_DISPATCH_SECRET di app ini tidak cocok dengan yang di server Relay Hub.");
  }

  const result = (await res.json()) as RelayDispatchResponse;
  if (!result.ok) {
    throw new Error(result.error || `Relay Agent "${agent.name}" gagal menjalankan perintah.`);
  }
  return result;
}

export const androidTvRelayAdapter: DeviceAdapter = {
  async turnOn(device: DeviceRecord) {
    await dispatch(device, "turnOn");
  },

  async turnOff(device: DeviceRecord) {
    await dispatch(device, "turnOff");
  },

  async getState(device: DeviceRecord): Promise<DevicePowerState> {
    try {
      const result = await dispatch(device, "getState");
      return result.state || "unknown";
    } catch {
      return "unknown";
    }
  },
};
