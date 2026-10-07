import { isPrivateLanIPv4 } from "@/lib/relay/capabilities";
import type { OfflineLocalControl } from "@/lib/relay/local-control";
import type { LocalUnit } from "./engine";

/**
 * Mode Offline × Kontrol Lokal: papan kasir offline menyuruh NexbillAgent (PC/HP di WiFi outlet)
 * menyalakan/mematikan TV & plug Tasmota saat sesi dimulai/dihentikan tanpa internet, dan memberi
 * tahu agent sisa waktu sesi supaya agent mematikan perangkat tepat waktu walau HP kasir mati.
 * Rancangan: lib/relay/local-control.ts.
 */

/**
 * localStorage: yang sudah dikirim ke agent selama Mode Offline. Dihapus setelah antrean offline
 * habis terkirim (sync-client.ts) — sejak itu server yang memegang kendali perangkat, dan catatan lama
 * tidak boleh membuat papan mematikan TV saat internet putus berikutnya.
 */
export const sentDevicesKey = (outletId: string) => `nexbill_offline_devices:${outletId}`;

/** Yang terakhir berhasil dikirim ke agent untuk satu unit. */
export interface SentDeviceState {
  sessionId: string | null;
  status: "running" | "paused" | null;
  endsAt: number | null;
}

export interface AgentCommandBody {
  power?: "on" | "off";
  /** Sisa waktu relatif (ms); null = tanpa batas waktu. */
  remainingMs?: number | null;
}

export interface PlannedCommand {
  unitId: string;
  body: AgentCommandBody;
  next: SentDeviceState;
}

export function sessionEndMs(s: NonNullable<LocalUnit["session"]>): number | null {
  if (s.plannedMinutes === null || s.status !== "running") return null;
  return Date.parse(s.startedAt) + s.accumulatedPauseMs + (s.plannedMinutes + s.extendedMinutes) * 60_000;
}

/**
 * MURNI: perintah yang perlu dikirim supaya perangkat tiap unit sesuai keadaan papan.
 *  - sesi baru dimulai offline → NYALAKAN + timer;
 *  - sesi yang sudah berjalan sebelum internet putus → timer saja (TV-nya sudah menyala);
 *  - dilanjutkan dari jeda → NYALAKAN + timer; dijeda → timer dihentikan (TV tetap menyala, sama
 *    seperti saat online);
 *  - diperpanjang → timer baru;
 *  - sesi selesai → MATIKAN.
 * Unit yang belum pernah dikirimi apa pun dan tidak punya sesi dibiarkan (tidak mematikan TV yang
 * mungkin sedang dipakai di luar sistem).
 */
export function planDeviceCommands(
  units: LocalUnit[],
  sent: Record<string, SentDeviceState>,
  covered: Record<string, string>,
  nowMs: number
): PlannedCommand[] {
  const out: PlannedCommand[] = [];
  for (const u of units) {
    if (!covered[u.id]) continue;
    const prev = sent[u.id];
    const s = u.session;
    if (!s) {
      if (prev?.sessionId) out.push({ unitId: u.id, body: { power: "off" }, next: { sessionId: null, status: null, endsAt: null } });
      continue;
    }
    const endsAt = sessionEndMs(s);
    const next: SentDeviceState = { sessionId: s.id, status: s.status, endsAt };
    const remainingMs = endsAt === null ? null : endsAt - nowMs;
    if (!prev || prev.sessionId !== s.id) {
      const turnOn = s.origin === "offline" && s.status === "running";
      out.push({ unitId: u.id, body: turnOn ? { power: "on", remainingMs } : { remainingMs }, next });
    } else if (prev.status !== s.status) {
      out.push({ unitId: u.id, body: s.status === "running" ? { power: "on", remainingMs } : { remainingMs: null }, next });
    } else if (prev.endsAt !== endsAt) {
      out.push({ unitId: u.id, body: { remainingMs }, next });
    }
  }
  return out;
}

export type AgentCommandResult = { ok: true; power?: string } | { ok: false; reason: "unreachable" | "rejected"; message?: string };

const PREFERRED_URL_KEY = "nexbill_local_agent_url:";

function preferredUrl(agentId: string): string | null {
  try {
    return localStorage.getItem(PREFERRED_URL_KEY + agentId);
  } catch {
    return null;
  }
}

function rememberUrl(agentId: string, url: string) {
  try {
    localStorage.setItem(PREFERRED_URL_KEY + agentId, url);
  } catch {
    /* tanpa penyimpanan: alamat dicoba berurutan lagi lain kali */
  }
}

/** Mengirim satu perintah ke agent yang mengontrol unit ini. Mencoba alamat yang terakhir berhasil lebih dulu. */
export async function sendAgentCommand(lc: OfflineLocalControl, unitId: string, body: AgentCommandBody): Promise<AgentCommandResult> {
  const agent = lc.agents.find((a) => a.id === lc.units[unitId]);
  if (!agent) return { ok: false, reason: "unreachable" };
  const first = preferredUrl(agent.id);
  const urls = first && agent.urls.includes(first) ? [first, ...agent.urls.filter((u) => u !== first)] : agent.urls;
  for (const base of urls) {
    const host = new URL(base).hostname;
    let res: Response;
    try {
      res = await fetch(`${base}/api/units/${encodeURIComponent(unitId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Nexbill-Key": agent.key },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(6000),
        // Chrome (Local Network Access): halaman https boleh memanggil alamat lokal setelah izin
        // "akses perangkat di jaringan lokal" diberikan. Browser lain mengabaikan opsi ini.
        targetAddressSpace: host === "127.0.0.1" ? "loopback" : isPrivateLanIPv4(host) ? "local" : undefined,
      } as RequestInit);
    } catch {
      continue; // alamat ini tidak terjangkau dari perangkat ini — coba berikutnya
    }
    rememberUrl(agent.id, base);
    const data = (await res.json().catch(() => ({}))) as { power?: string; error?: string };
    if (res.ok) return { ok: true, power: data.power };
    return { ok: false, reason: "rejected", message: data.error ?? `HTTP ${res.status}` };
  }
  return { ok: false, reason: "unreachable" };
}

/** Alamat halaman Kontrol Lokal yang bisa dibuka staf dari HP/PC lain di WiFi outlet. */
export function localControlPageUrls(lc: OfflineLocalControl | undefined): string[] {
  const urls = new Set<string>();
  for (const a of lc?.agents ?? []) for (const u of a.urls) if (!u.includes("127.0.0.1")) urls.add(u);
  return [...urls];
}
