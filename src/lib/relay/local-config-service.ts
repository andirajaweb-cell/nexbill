import { db } from "@/db/client";
import { devices, outlets, relayAgentLocalInfo, relayAgents, rentalSessions, rentalUnits, tvScreens } from "@/db/schema";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { parseStoredCapabilities } from "./capabilities";
import { deriveLocalSecrets } from "./local-control-secrets";
import {
  agentBaseUrls,
  buildLocalUnits,
  parseLocalInfo,
  sessionEndsAtMs,
  type LocalControlUnit,
  type LocalUncoveredUnit,
  type OfflineLocalControl,
  type RelayLocalConfigMessage,
  type RelayLocalInfo,
} from "./local-control";

/** Origin dashboard NEXBILL yang boleh memanggil API agent dari browser (header CORS agent). */
export function localControlAllowedOrigins(): string[] {
  const origins = new Set(["https://nexbill.id", "https://www.nexbill.id"]);
  for (const raw of [process.env.APP_BASE_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      /* nilai env bukan URL — abaikan */
    }
  }
  return [...origins];
}

/**
 * local_config untuk satu agent (lihat lib/relay/local-control.ts): unit yang bisa ia kontrol lewat
 * LAN + sesi yang sedang berjalan di server. Dipakai Relay Hub (dikirim ke agent) dan halaman
 * Kontrol Perangkat (daftar unit yang tercakup / tidak).
 */
export async function buildLocalConfigForAgent(
  relayAgentId: string,
  outletId: string
): Promise<{ message: RelayLocalConfigMessage; uncovered: LocalUncoveredUnit[] }> {
  const [outlet] = await db.select({ name: outlets.name }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const units = await db
    .select({ id: rentalUnits.id, name: rentalUnits.name, deviceId: rentalUnits.deviceId, isActive: rentalUnits.isActive })
    .from(rentalUnits)
    .where(eq(rentalUnits.outletId, outletId));
  const deviceRows = await db
    .select({ id: devices.id, protocol: devices.protocol, config: devices.config })
    .from(devices)
    .where(eq(devices.outletId, outletId));
  // Pindah HDMI saat TV dinyalakan hanya untuk layar yang otomatisasinya aktif & sudah diverifikasi —
  // aturan yang sama dengan jalur online (lib/tv/automation.ts findAutoSwitchTarget).
  const screens = await db
    .select({ rentalUnitId: tvScreens.rentalUnitId, hdmiPort: tvScreens.hdmiPort })
    .from(tvScreens)
    .where(and(eq(tvScreens.outletId, outletId), eq(tvScreens.isActive, true), eq(tvScreens.autoSwitchEnabled, true), isNotNull(tvScreens.autoSwitchVerifiedAt)));
  const sessions = await db
    .select({
      rentalUnitId: rentalSessions.rentalUnitId,
      startedAt: rentalSessions.startedAt,
      status: rentalSessions.status,
      accumulatedPauseMs: rentalSessions.accumulatedPauseMs,
      plannedMinutes: rentalSessions.plannedMinutes,
      extendedMinutes: rentalSessions.extendedMinutes,
    })
    .from(rentalSessions)
    .where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused"] as const)));

  const { covered, uncovered } = buildLocalUnits({ units, devices: deviceRows, screens, agentId: relayAgentId });
  const coveredIds = new Set(covered.map((u) => u.id));
  return {
    message: {
      type: "local_config",
      outletName: outlet?.name ?? "NEXBILL",
      units: covered,
      serverSessions: sessions
        .filter((s) => coveredIds.has(s.rentalUnitId))
        .map((s) => {
          const end = sessionEndsAtMs(s);
          return { unitId: s.rentalUnitId, endsAt: end === null ? null : new Date(end).toISOString(), paused: s.status === "paused" };
        }),
      allowedOrigins: localControlAllowedOrigins(),
      generatedAt: new Date().toISOString(),
    },
    uncovered,
  };
}

export interface OutletLocalAgent {
  id: string;
  name: string;
  status: "online" | "offline";
  agentVersion: string | null;
  /** Agent v1.4+ yang melaporkan kemampuan "local_control". */
  supportsLocal: boolean;
  localInfo: RelayLocalInfo | null;
  key: string;
  pin: string;
  covered: LocalControlUnit[];
  uncovered: LocalUncoveredUnit[];
}

/** Alamat LAN per agent (migrasi 0033). Tabel belum ada = kosong; fitur lain tidak ikut gagal. */
async function loadLocalInfo(agentIds: string[]): Promise<Map<string, RelayLocalInfo | null>> {
  const out = new Map<string, RelayLocalInfo | null>();
  if (agentIds.length === 0) return out;
  try {
    const rows = await db
      .select({ id: relayAgentLocalInfo.relayAgentId, info: relayAgentLocalInfo.localInfo })
      .from(relayAgentLocalInfo)
      .where(inArray(relayAgentLocalInfo.relayAgentId, agentIds));
    for (const r of rows) out.set(r.id, parseLocalInfo(r.info));
  } catch (err) {
    console.warn(`[local-control] Alamat LAN agent tidak terbaca (${describeError(err)}) — jalankan supabase/migrations/0033_relay_agent_local_control.sql.`);
  }
  return out;
}

/** Semua Relay Agent outlet beserta unit yang bisa dikontrolnya lewat LAN, kunci, dan PIN Kontrol Lokal. */
export async function getOutletLocalAgents(outletId: string): Promise<OutletLocalAgent[]> {
  const agents = await db
    .select({
      id: relayAgents.id,
      name: relayAgents.name,
      status: relayAgents.status,
      token: relayAgents.token,
      agentVersion: relayAgents.agentVersion,
      capabilities: relayAgents.capabilities,
    })
    .from(relayAgents)
    .where(eq(relayAgents.outletId, outletId));
  const infos = await loadLocalInfo(agents.map((a) => a.id));
  const result: OutletLocalAgent[] = [];
  for (const a of agents) {
    const { message, uncovered } = await buildLocalConfigForAgent(a.id, outletId);
    const secrets = deriveLocalSecrets(a.token);
    result.push({
      id: a.id,
      name: a.name,
      status: a.status,
      agentVersion: a.agentVersion,
      supportsLocal: parseStoredCapabilities(a.capabilities).includes("local_control"),
      localInfo: infos.get(a.id) ?? null,
      key: secrets.key,
      pin: secrets.pin,
      covered: message.units,
      uncovered,
    });
  }
  return result;
}

/**
 * Bagian Kontrol Lokal dari snapshot Mode Offline: kunci API & alamat tiap agent, dan agent mana yang
 * mengontrol unit mana. Plug Tasmota bisa dijangkau semua agent; dipilih agent yang sedang online.
 */
export async function offlineLocalControlFor(outletId: string): Promise<OfflineLocalControl> {
  const agents = (await getOutletLocalAgents(outletId)).filter((a) => a.supportsLocal && a.covered.length > 0);
  agents.sort((x, y) => Number(y.status === "online") - Number(x.status === "online"));
  const units: Record<string, string> = {};
  for (const a of agents) for (const u of a.covered) if (!units[u.id]) units[u.id] = a.id;
  return { agents: agents.map((a) => ({ id: a.id, key: a.key, urls: agentBaseUrls(a.localInfo) })), units };
}
