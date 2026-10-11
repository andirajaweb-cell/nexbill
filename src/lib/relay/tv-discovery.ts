import { isPrivateLanIPv4 } from "./capabilities";

/**
 * TV yang ditemukan & dihubungkan NexbillAgent v1.5 lewat layar "Hubungkan TV" (localhost:8737/setup)
 * — MURNI (tanpa db), dipakai scripts/relay-hub.ts (menyimpan laporan) dan /api/devices/discovered-tvs
 * (menampilkannya di Kontrol Perangkat dengan tombol "Tambahkan").
 *
 * Disimpan di kolom JSON yang SUDAH ADA (relay_agent_local_info.local_info, migrasi 0033) sebagai
 * kunci `tvs` & `tvsAt` di samping `addresses`/`port` Kontrol Lokal — tidak butuh migrasi baru.
 * Karena itu kedua penulis (alamat LAN saat auth, laporan TV) WAJIB menggabungkan, bukan menimpa:
 * lihat mergeLocalInfoJson.
 *
 * Validasi di sini mengulang validasi agent (sanitizeTvList di nexbill-agent-dist/index.js): data
 * dari agent tidak dipercaya begitu saja — IP harus jaringan lokal, port 1-65535, teks dipotong.
 */

export type DiscoveredTvState = "ready" | "unauthorized" | "offline" | "found";

export interface DiscoveredTv {
  ip: string;
  port: number;
  state: DiscoveredTvState;
  brand?: string;
  model?: string;
}

const STATES: DiscoveredTvState[] = ["ready", "unauthorized", "offline", "found"];
export const TV_REPORT_MAX = 50;

export function sanitizeTvReport(raw: unknown): DiscoveredTv[] {
  if (!Array.isArray(raw)) return [];
  const out: DiscoveredTv[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const tv = item as Record<string, unknown>;
    if (!isPrivateLanIPv4(tv.ip)) continue;
    const port = typeof tv.port === "number" && Number.isInteger(tv.port) && tv.port >= 1 && tv.port <= 65535 ? tv.port : null;
    if (port === null) continue;
    const ip = String(tv.ip).trim();
    const key = `${ip}:${port}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const state = STATES.includes(tv.state as DiscoveredTvState) ? (tv.state as DiscoveredTvState) : "found";
    const entry: DiscoveredTv = { ip, port, state };
    if (typeof tv.brand === "string" && tv.brand.trim()) entry.brand = tv.brand.trim().slice(0, 40);
    if (typeof tv.model === "string" && tv.model.trim()) entry.model = tv.model.trim().slice(0, 60);
    out.push(entry);
    if (out.length >= TV_REPORT_MAX) break;
  }
  return out;
}

function parseObject(text: string | null | undefined): Record<string, unknown> {
  if (!text) return {};
  try {
    const v: unknown = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Menggabungkan perubahan ke JSON local_info yang tersimpan tanpa menghapus kunci lain. */
export function mergeLocalInfoJson(existing: string | null | undefined, patch: Record<string, unknown>): string {
  return JSON.stringify({ ...parseObject(existing), ...patch });
}

/** TV dari local_info tersimpan (divalidasi ulang) + waktu laporannya. */
export function parseStoredTvs(stored: string | null | undefined): { tvs: DiscoveredTv[]; reportedAt: string | null } {
  const v = parseObject(stored);
  return { tvs: sanitizeTvReport(v.tvs), reportedAt: typeof v.tvsAt === "string" ? v.tvsAt : null };
}

/** Nama perangkat bawaan saat merchant menekan "Tambahkan": merek + model, atau "TV <ip>". */
export function defaultTvDeviceName(tv: Pick<DiscoveredTv, "ip" | "brand" | "model">): string {
  const name = [tv.brand, tv.model].filter(Boolean).join(" ").trim();
  return (name || `TV ${tv.ip}`).slice(0, 60);
}
