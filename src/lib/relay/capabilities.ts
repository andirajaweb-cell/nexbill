/**
 * Versi dan kemampuan Relay Agent — MURNI (tanpa db, tanpa jaringan, tanpa process.env), karena
 * dipakai di TIGA tempat yang harus selalu sepakat:
 *
 *   - scripts/relay-hub.ts           — menolak meneruskan perintah yang tidak didukung agent
 *   - src/lib/devices/adapters/...   — (tahap 2) memilih perintah berdasarkan kemampuan agent
 *   - nexbill-agent-dist/index.js    — (tahap 3) agent v1.2 melaporkan kemampuannya
 *
 * Lihat AGENT-V1.2-DESIGN.md di root folder proyek untuk rancangan lengkapnya.
 *
 * KENAPA MODUL INI ADA — satu bug nyata di agent v1.1 (nexbill-agent-dist/index.js):
 *
 *     if (action === 'turnOn')  { ... }
 *     if (action === 'turnOff') { ... }
 *     // action === 'getState'   ← SEMUA perintah lain jatuh ke sini, lalu ok: true
 *
 * Agent v1.1 membalas BERHASIL untuk perintah yang tidak ia kenal. Begitu NEXBILL mulai
 * mengirim perintah baru (buka screensaver, pindah HDMI), agent lama akan pura-pura berhasil
 * sementara TV diam saja. Agent yang sudah terpasang di outlet tidak bisa diperbaiki dari jauh —
 * jadi penjaganya harus di hub, dan hub harus tahu persis apa yang mampu dilakukan tiap agent.
 */

/** Setiap perintah yang dikenal hub. Perintah di luar daftar ini DITOLAK hub, tidak diteruskan. */
export const RELAY_ACTIONS = ["turnOn", "turnOff", "getState", "openScreensaver", "switchHdmi", "getTvInfo"] as const;
export type RelayAction = (typeof RELAY_ACTIONS)[number];

/**
 * Kemampuan yang bisa dilaporkan agent.
 *
 * "self_update" tidak memetakan ke perintah mana pun — agent mengambil update sendiri, bukan
 * disuruh hub. Ia ada di daftar supaya dashboard bisa tahu agent mana yang akan memperbarui
 * dirinya dan mana yang masih harus dipasang manual.
 */
export const RELAY_CAPABILITIES = ["power", "open_screensaver", "switch_hdmi", "tv_info", "self_update"] as const;
export type RelayCapability = (typeof RELAY_CAPABILITIES)[number];

export const ACTION_REQUIRES: Record<RelayAction, RelayCapability> = {
  turnOn: "power",
  turnOff: "power",
  getState: "power",
  openScreensaver: "open_screensaver",
  switchHdmi: "switch_hdmi",
  getTvInfo: "tv_info",
};

/**
 * Agent yang tidak melaporkan versi dianggap v1.1 — satu-satunya versi yang pernah dirilis
 * sebelum laporan versi ada — dan hanya dipercaya untuk "power". Itu persis kemampuan v1.1
 * yang sesungguhnya, jadi agent lama tetap bekerja seperti biasa, tidak lebih.
 */
export const LEGACY_AGENT_VERSION = "1.1";
export const LEGACY_CAPABILITIES: readonly RelayCapability[] = ["power"];

const KNOWN_CAPABILITIES = new Set<string>(RELAY_CAPABILITIES);
const KNOWN_ACTIONS = new Set<string>(RELAY_ACTIONS);
const VERSION_PATTERN = /^\d{1,3}\.\d{1,3}(\.\d{1,3})?$/;

export function isRelayAction(value: unknown): value is RelayAction {
  return typeof value === "string" && KNOWN_ACTIONS.has(value);
}

export interface AgentHandshake {
  agentVersion: string;
  capabilities: RelayCapability[];
  /** true = agent melaporkan versinya (v1.2+). false = agent lama, dianggap v1.1. */
  reported: boolean;
}

/**
 * Menormalkan pesan auth dari agent menjadi versi + kemampuan yang boleh dipercaya hub.
 *
 * Tiga aturan yang disengaja:
 *
 *   1. Kemampuan yang tidak dikenal DIBUANG. Agent versi masa depan boleh melaporkan kemampuan
 *      baru, tapi hub yang belum mengenalnya tidak boleh ikut "mengizinkan" sesuatu yang tidak
 *      ia pahami.
 *
 *   2. "power" selalu disertakan. Setiap versi agent yang pernah ada bisa menyalakan/mematikan
 *      TV; agent v1.2 yang lupa mencantumkannya tidak boleh tiba-tiba kehilangan kontrol TV
 *      paling dasar dan membuat kasir tidak bisa memulai sesi.
 *
 *   3. Versi yang formatnya aneh diperlakukan sebagai v1.1 — gagal ke sisi paling terbatas,
 *      bukan paling longgar.
 */
export function normalizeHandshake(msg: { agentVersion?: unknown; capabilities?: unknown }): AgentHandshake {
  const rawVersion = typeof msg.agentVersion === "string" ? msg.agentVersion.trim() : "";
  if (!VERSION_PATTERN.test(rawVersion)) {
    return { agentVersion: LEGACY_AGENT_VERSION, capabilities: [...LEGACY_CAPABILITIES], reported: false };
  }

  const reported = Array.isArray(msg.capabilities) ? msg.capabilities : [];
  const caps = new Set<RelayCapability>(["power"]);
  for (const c of reported) {
    if (typeof c === "string" && KNOWN_CAPABILITIES.has(c)) caps.add(c as RelayCapability);
  }
  // Urutan tetap (mengikuti RELAY_CAPABILITIES) supaya nilai yang disimpan ke database stabil dan
  // mudah dibandingkan antar-koneksi.
  return { agentVersion: rawVersion, capabilities: RELAY_CAPABILITIES.filter((c) => caps.has(c)), reported: true };
}

/** Membaca kolom relay_agents.capabilities (teks JSON). Kosong/rusak = kemampuan v1.1. */
export function parseStoredCapabilities(stored: string | null | undefined): RelayCapability[] {
  if (!stored) return [...LEGACY_CAPABILITIES];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [...LEGACY_CAPABILITIES];
    const caps = new Set<RelayCapability>(["power"]);
    for (const c of parsed) if (typeof c === "string" && KNOWN_CAPABILITIES.has(c)) caps.add(c as RelayCapability);
    return RELAY_CAPABILITIES.filter((c) => caps.has(c));
  } catch {
    return [...LEGACY_CAPABILITIES];
  }
}

export type ActionCheck = { ok: true } | { ok: false; error: string };

export function checkActionAllowed(capabilities: readonly RelayCapability[], action: RelayAction, agentVersion: string): ActionCheck {
  const needed = ACTION_REQUIRES[action];
  if (capabilities.includes(needed)) return { ok: true };
  return {
    ok: false,
    error: `NexbillAgent di outlet ini (versi ${agentVersion}) belum mendukung perintah "${action}". Perbarui NexbillAgent ke versi terbaru.`,
  };
}

/** Port HDMI 1-4 sebagai bilangan bulat, atau null. Nilai lain (0, 5, "2; rm -rf", 2.5) ditolak. */
export function validateHdmiPort(value: unknown): 1 | 2 | 3 | 4 | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= 1 && value <= 4 ? (value as 1 | 2 | 3 | 4) : null;
}

/**
 * Nama paket Android, mis. "com.contoh.browser". Pola ketat — huruf/angka/garis bawah, minimal dua
 * segmen dipisah titik, setiap segmen diawali huruf. Nilai ini akhirnya menjadi bagian perintah
 * `am start` di TV, jadi apa pun yang mengandung spasi, titik koma, kutip, atau karakter shell
 * lain harus ditolak di sini, bukan "dibersihkan".
 */
export function validateAndroidPackage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (v.length > 150) return null;
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(v) ? v : null;
}

/**
 * Alamat IPv4 jaringan lokal (RFC 1918): 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16.
 *
 * TV di bilik selalu ada di jaringan lokal outlet. Agent yang disuruh `adb connect` ke alamat di
 * internet berarti ada yang salah — salah ketik IP, atau hub yang disalahgunakan.
 */
export function isPrivateLanIPv4(ip: unknown): boolean {
  if (typeof ip !== "string") return false;
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b, c, d] = m.slice(1).map(Number);
  if ([a, b, c, d].some((n) => n > 255)) return false;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}
