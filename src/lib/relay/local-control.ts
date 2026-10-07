import { isPrivateLanIPv4 } from "./capabilities";

/**
 * Kontrol Lokal — TV & smart plug tetap bisa dinyalakan/dimatikan saat INTERNET outlet putus tapi
 * WiFi/router outlet masih menyala. MURNI (tanpa db, jaringan, crypto) karena dipakai hub, API
 * dashboard, papan kasir offline (browser), dan unit test.
 *
 * Alurnya:
 *   1. Selama online, NexbillAgent (PC/HP di outlet, satu WiFi dengan TV & plug) meminta
 *      `local_config` ke Relay Hub tiap 30 detik: daftar unit beserta alamat LAN perangkatnya
 *      (IP Android TV untuk ADB, IP lokal plug Tasmota) dan sesi yang sedang berjalan di server.
 *      Agent menyimpannya di config.json, jadi tetap tersedia setelah internet putus / PC restart.
 *   2. Agent membuka server HTTP kecil di LAN (port LOCAL_CONTROL_PORT):
 *        - halaman "Kontrol Lokal" (http://<ip-agent>:8737) untuk staf, login PIN 6 angka;
 *        - API JSON untuk papan kasir offline NEXBILL (kunci panjang, lihat local-control-secrets.ts).
 *   3. Saat internet putus: kasir memulai/menghentikan sesi di Mode Offline → browser memanggil
 *      agent → agent menjalankan ADB (Android TV) atau HTTP lokal Tasmota (`/cm?cmnd=Power On`).
 *      Agent juga mematikan perangkat sendiri saat waktu sesi habis, walau HP/PC kasir mati.
 *   4. Begitu online lagi, server kembali memegang kendali (agent tidak menjalankan timer apa pun
 *      selama tersambung ke hub) dan sinkron Mode Offline merapikan status perangkat.
 *
 * Perangkat cloud (Tuya, eWeLink) memang tidak bisa dikontrol tanpa internet — perintahnya lewat
 * server pabrikan.
 */

export const LOCAL_CONTROL_PORT = 8737;

/** Android TV lewat ADB, atau plug Tasmota lewat API HTTP lokalnya. */
export type LocalDevice =
  | { kind: "android_tv"; ip: string; port: number; hdmiPort: number | null }
  | { kind: "tasmota"; ip: string };

export interface LocalControlUnit {
  id: string;
  name: string;
  device: LocalDevice;
}

/** Kenapa sebuah unit TIDAK bisa dikontrol lokal oleh agent ini. */
export type LocalUncoveredReason = "no_device" | "cloud_only" | "no_local_ip" | "other_agent" | "unsupported";

export interface LocalUncoveredUnit {
  id: string;
  name: string;
  reason: LocalUncoveredReason;
  protocol?: string;
  deviceId?: string;
}

/** Sesi yang diketahui server untuk satu unit — agent memakai `endsAt` untuk mematikan perangkat saat offline. */
export interface LocalServerSession {
  unitId: string;
  /** null = main bebas (tanpa batas waktu) atau sedang dijeda. */
  endsAt: string | null;
  paused: boolean;
}

/** Hub → Agent. */
export interface RelayLocalConfigMessage {
  type: "local_config";
  outletName: string;
  units: LocalControlUnit[];
  serverSessions: LocalServerSession[];
  /** Origin halaman NEXBILL yang boleh memanggil API agent dari browser (CORS). */
  allowedOrigins: string[];
  generatedAt: string;
}

/** Agent → Hub: minta local_config terbaru. */
export interface RelayLocalConfigRequest {
  type: "local_config_request";
}

/** Dilaporkan agent saat auth (v1.4+): alamat LAN tempat halaman Kontrol Lokal bisa dibuka. */
export interface RelayLocalInfo {
  addresses: string[];
  port: number;
}

interface UnitRow {
  id: string;
  name: string;
  deviceId: string | null;
  isActive?: boolean | null;
}

interface DeviceRow {
  id: string;
  protocol: string;
  config: string | null;
}

interface ScreenRow {
  rentalUnitId: string | null;
  hdmiPort: number | null;
}

function parseJson(config: string | null): Record<string, unknown> {
  if (!config) return {};
  try {
    const v: unknown = JSON.parse(config);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** IP lokal plug Tasmota (devices.config.localIp), hanya bila alamat LAN yang sah. */
export function parseTasmotaLocalIp(config: string | null): string | null {
  const ip = parseJson(config).localIp;
  return typeof ip === "string" && isPrivateLanIPv4(ip) ? ip.trim() : null;
}

/** true bila devices.config berisi localIp yang BUKAN alamat jaringan lokal (salah ketik / alamat internet). */
export function hasInvalidTasmotaLocalIp(config: string | null | undefined): boolean {
  const ip = parseJson(config ?? null).localIp;
  return ip !== undefined && ip !== null && ip !== "" && !(typeof ip === "string" && isPrivateLanIPv4(ip));
}

/** devices.config baru dengan localIp diganti (null = dihapus); kunci lain dipertahankan. */
export function withTasmotaLocalIp(config: string | null, ip: string | null): string | null {
  const cfg = parseJson(config);
  if (ip) cfg.localIp = ip.trim();
  else delete cfg.localIp;
  return Object.keys(cfg).length ? JSON.stringify(cfg) : null;
}

/**
 * Unit mana yang bisa dikontrol lokal oleh SATU agent, dan alasan untuk yang tidak.
 *
 * - Android TV (android_tv_relay): hanya oleh agent yang dipasangkan dengan TV itu — agent itulah
 *   yang sudah diizinkan TV lewat popup "Allow debugging?".
 * - Tasmota: oleh agent mana pun di outlet, asal IP lokal plug diketahui.
 * - Tuya/eWeLink: tidak bisa (perintah lewat cloud pabrikan).
 */
export function buildLocalUnits(input: {
  units: UnitRow[];
  devices: DeviceRow[];
  screens: ScreenRow[];
  agentId: string;
}): { covered: LocalControlUnit[]; uncovered: LocalUncoveredUnit[] } {
  const covered: LocalControlUnit[] = [];
  const uncovered: LocalUncoveredUnit[] = [];
  const deviceById = new Map(input.devices.map((d) => [d.id, d]));
  for (const unit of input.units) {
    if (unit.isActive === false) continue;
    const device = unit.deviceId ? deviceById.get(unit.deviceId) : undefined;
    if (!device) {
      uncovered.push({ id: unit.id, name: unit.name, reason: "no_device" });
      continue;
    }
    const base = { id: unit.id, name: unit.name, protocol: device.protocol, deviceId: device.id };
    if (device.protocol === "android_tv_relay") {
      const cfg = parseJson(device.config);
      if (cfg.relayAgentId !== input.agentId) {
        uncovered.push({ ...base, reason: "other_agent" });
        continue;
      }
      if (!isPrivateLanIPv4(cfg.ip)) {
        uncovered.push({ ...base, reason: "no_local_ip" });
        continue;
      }
      const port = Number.isInteger(cfg.port) && (cfg.port as number) >= 1 && (cfg.port as number) <= 65535 ? (cfg.port as number) : 5555;
      const screen = input.screens.find((s) => s.rentalUnitId === unit.id);
      const hdmi = screen?.hdmiPort ?? null;
      covered.push({
        id: unit.id,
        name: unit.name,
        device: { kind: "android_tv", ip: (cfg.ip as string).trim(), port, hdmiPort: hdmi !== null && hdmi >= 1 && hdmi <= 4 ? hdmi : null },
      });
      continue;
    }
    if (device.protocol === "tasmota_mqtt") {
      const ip = parseTasmotaLocalIp(device.config);
      if (!ip) uncovered.push({ ...base, reason: "no_local_ip" });
      else covered.push({ id: unit.id, name: unit.name, device: { kind: "tasmota", ip } });
      continue;
    }
    uncovered.push({ ...base, reason: device.protocol === "tuya" || device.protocol === "sonoff_ewelink" ? "cloud_only" : "unsupported" });
  }
  return { covered, uncovered };
}

/**
 * Kapan sesi habis (ms epoch): mulai + total jeda + (durasi + perpanjangan). null untuk main bebas
 * dan sesi yang sedang dijeda (waktunya berhenti berjalan).
 */
export function sessionEndsAtMs(s: {
  startedAt: string;
  status: string;
  accumulatedPauseMs: number;
  plannedMinutes: number | null;
  extendedMinutes: number;
}): number | null {
  if (s.plannedMinutes === null || s.status !== "running") return null;
  const start = Date.parse(s.startedAt);
  if (!Number.isFinite(start)) return null;
  return start + (s.accumulatedPauseMs || 0) + (s.plannedMinutes + (s.extendedMinutes || 0)) * 60_000;
}

/** Alamat yang dicoba browser untuk menjangkau agent: perangkat ini sendiri dulu, lalu IP LAN agent. */
export function agentBaseUrls(info: RelayLocalInfo | null | undefined): string[] {
  const port = info && Number.isInteger(info.port) && info.port > 0 && info.port <= 65535 ? info.port : LOCAL_CONTROL_PORT;
  const urls = [`http://127.0.0.1:${port}`];
  for (const a of info?.addresses ?? []) if (isPrivateLanIPv4(a)) urls.push(`http://${a.trim()}:${port}`);
  return [...new Set(urls)];
}

/** relay_agents.local_info (teks JSON) → RelayLocalInfo, atau null bila kosong/rusak. */
export function parseLocalInfo(stored: string | null | undefined): RelayLocalInfo | null {
  if (!stored) return null;
  const v = parseJson(stored);
  const addresses = Array.isArray(v.addresses) ? v.addresses.filter((a): a is string => isPrivateLanIPv4(a)).slice(0, 8) : [];
  const port = typeof v.port === "number" && Number.isInteger(v.port) && v.port > 0 && v.port <= 65535 ? v.port : LOCAL_CONTROL_PORT;
  return { addresses, port };
}

/**
 * IP LAN plug dari balasan Tasmota `Status 5` (topik stat/<topic>/STATUS5):
 * {"StatusNET":{"Hostname":"...","IPAddress":"192.168.1.23",...}}. null bila bukan IP lokal.
 */
export function parseTasmotaStatusNetIp(payload: string): string | null {
  try {
    const v = JSON.parse(payload) as { StatusNET?: { IPAddress?: unknown } };
    const ip = v?.StatusNET?.IPAddress;
    return typeof ip === "string" && isPrivateLanIPv4(ip) ? ip.trim() : null;
  } catch {
    return null;
  }
}

/** Data Kontrol Lokal untuk papan kasir offline (bagian dari GET /api/offline/snapshot). */
export interface OfflineLocalControl {
  agents: { id: string; key: string; urls: string[] }[];
  /** unitId → id agent yang mengontrol perangkat unit itu lewat LAN. */
  units: Record<string, string>;
}
