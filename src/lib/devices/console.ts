/**
 * Logika murni halaman Kontrol Perangkat (/dashboard/devices) sejak tampilan "konsol" 2026-11-12:
 * sub-halaman (?tab=), jenis perangkat, kesehatan, ringkasan angka di kepala halaman, dan filter
 * daftar. Tanpa React/DB — diuji di console.test.ts.
 */

export const DEVICE_CONSOLE_TABS = ["panel", "units", "add", "connection", "guide"] as const;
export type DeviceConsoleTab = (typeof DEVICE_CONSOLE_TABS)[number];

/** `?tab=` → sub-halaman; null bila tidak dikenal. Alias Indonesia ikut diterima. */
export function deviceConsoleTabFromSlug(slug: string | null | undefined): DeviceConsoleTab | null {
  if (!slug) return null;
  const s = slug.trim().toLowerCase();
  const alias: Record<string, DeviceConsoleTab> = { perangkat: "panel", unit: "units", tambah: "add", koneksi: "connection", panduan: "guide" };
  if ((DEVICE_CONSOLE_TABS as readonly string[]).includes(s)) return s as DeviceConsoleTab;
  return alias[s] ?? null;
}

/** Sub-halaman yang boleh dibuka: "add" hanya untuk yang boleh mengelola perangkat. */
export function visibleDeviceConsoleTabs(canManage: boolean): DeviceConsoleTab[] {
  return DEVICE_CONSOLE_TABS.filter((tab) => canManage || tab !== "add");
}

export type DeviceKind = "tv" | "plug";

export function deviceKind(protocol: string): DeviceKind {
  return protocol === "android_tv_adb" || protocol === "android_tv_relay" ? "tv" : "plug";
}

// 2x jeda sapuan heartbeat (scripts/device-heartbeat.ts memeriksa tiap 3 menit) — TV yang tidak
// terlihat lebih dari satu siklus terlewat ditandai, tanpa alarm palsu karena satu detak lambat.
// lastSeenAt hanya maju saat getState berhasil (lib/devices/heartbeat.ts).
export const TV_STALE_THRESHOLD_MS = 6 * 60_000;

export function isTvStale(lastSeenAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!lastSeenAt) return true;
  const seen = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(seen)) return true;
  return now - seen > TV_STALE_THRESHOLD_MS;
}

export interface ConsoleDevice {
  id: string;
  name: string;
  protocol: string;
  lastKnownState: string;
  lastSeenAt: string | null;
}

/**
 * Kesehatan satu perangkat untuk lencana & filter:
 *  - "attention": TV yang lama tidak merespons (statusnya tidak bisa dipercaya)
 *  - "on" / "off": status terakhir yang diketahui
 *  - "unknown": belum pernah dinyalakan/dimatikan dari NEXBILL
 */
export type DeviceHealth = "on" | "off" | "attention" | "unknown";

export function deviceHealth(d: Pick<ConsoleDevice, "protocol" | "lastKnownState" | "lastSeenAt">, now: number = Date.now()): DeviceHealth {
  if (deviceKind(d.protocol) === "tv" && isTvStale(d.lastSeenAt, now)) return "attention";
  if (d.lastKnownState === "on") return "on";
  if (d.lastKnownState === "off") return "off";
  return "unknown";
}

export interface DeviceConsoleSummary {
  total: number;
  tv: number;
  plug: number;
  on: number;
  off: number;
  attention: number;
  unknown: number;
  /** Unit aktif & berapa yang sudah punya perangkat (yang masih ada). */
  unitsTotal: number;
  unitsLinked: number;
  agentsTotal: number;
  agentsOnline: number;
}

export function summarizeDeviceConsole(
  devices: ConsoleDevice[],
  units: { deviceId: string | null; isActive?: boolean | null }[],
  agents: { status: string }[],
  now: number = Date.now()
): DeviceConsoleSummary {
  const s: DeviceConsoleSummary = { total: devices.length, tv: 0, plug: 0, on: 0, off: 0, attention: 0, unknown: 0, unitsTotal: 0, unitsLinked: 0, agentsTotal: agents.length, agentsOnline: 0 };
  const ids = new Set(devices.map((d) => d.id));
  for (const d of devices) {
    s[deviceKind(d.protocol)]++;
    s[deviceHealth(d, now)]++;
  }
  for (const u of units) {
    if (u.isActive === false) continue;
    s.unitsTotal++;
    if (u.deviceId && ids.has(u.deviceId)) s.unitsLinked++;
  }
  s.agentsOnline = agents.filter((a) => a.status === "online").length;
  return s;
}

export type DeviceKindFilter = "all" | DeviceKind;
export type DeviceStateFilter = "all" | DeviceHealth;

export interface DeviceFilter {
  q?: string;
  kind?: DeviceKindFilter;
  state?: DeviceStateFilter;
}

/**
 * Saring daftar perangkat. `extraText(d)` = teks tambahan yang ikut dicari (nama unit yang
 * terhubung, IP, topic) supaya kasir bisa mengetik "Bilik 3" dan menemukan plug-nya.
 */
export function filterDevices<T extends ConsoleDevice>(devices: T[], f: DeviceFilter, extraText: (d: T) => string = () => "", now: number = Date.now()): T[] {
  const q = (f.q ?? "").trim().toLowerCase();
  return devices.filter((d) => {
    if (f.kind && f.kind !== "all" && deviceKind(d.protocol) !== f.kind) return false;
    if (f.state && f.state !== "all" && deviceHealth(d, now) !== f.state) return false;
    if (q && !`${d.name} ${extraText(d)}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Urutan tampil: yang perlu perhatian dulu, lalu menyala, lalu sisanya; di dalamnya urut nama (angka alami). */
export function sortDevicesForConsole<T extends ConsoleDevice>(devices: T[], now: number = Date.now()): T[] {
  const rank: Record<DeviceHealth, number> = { attention: 0, on: 1, unknown: 2, off: 3 };
  return [...devices].sort(
    (a, b) => rank[deviceHealth(a, now)] - rank[deviceHealth(b, now)] || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );
}

/** "3 mnt", "2 jam", "5 hr" — selisih waktu ringkas tanpa bergantung bahasa (satuan diterjemahkan pemanggil). */
export function elapsedParts(iso: string | null | undefined, now: number = Date.now()): { value: number; unit: "now" | "minute" | "hour" | "day" } | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const min = Math.floor(Math.max(0, now - then) / 60_000);
  if (min < 1) return { value: 0, unit: "now" };
  if (min < 60) return { value: min, unit: "minute" };
  if (min < 60 * 24) return { value: Math.floor(min / 60), unit: "hour" };
  return { value: Math.floor(min / (60 * 24)), unit: "day" };
}
