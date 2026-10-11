import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { devices, relayAgentLocalInfo, relayAgents } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { parseStoredCapabilities } from "@/lib/relay/capabilities";
import { defaultTvDeviceName, parseStoredTvs } from "@/lib/relay/tv-discovery";

/**
 * TV yang ditemukan/dihubungkan NexbillAgent v1.5 di layar "Hubungkan TV" (localhost:8737/setup),
 * untuk kartu di Kontrol Perangkat. TV yang IP-nya sudah terdaftar sebagai perangkat ditandai
 * `added`, supaya merchant hanya melihat tombol "Tambahkan" untuk TV yang belum ada.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const canManage = hasPermission(session.role as StaffRole, "manage_devices");

    // Kolom dipilih eksplisit — lihat catatan urutan deploy di schema relayAgents.
    const agents = await db
      .select({ id: relayAgents.id, name: relayAgents.name, status: relayAgents.status, agentVersion: relayAgents.agentVersion, capabilities: relayAgents.capabilities })
      .from(relayAgents)
      .where(eq(relayAgents.outletId, session.outletId));

    const infoById = new Map<string, string>();
    if (agents.length) {
      try {
        const rows = await db
          .select({ id: relayAgentLocalInfo.relayAgentId, info: relayAgentLocalInfo.localInfo })
          .from(relayAgentLocalInfo)
          .where(inArray(relayAgentLocalInfo.relayAgentId, agents.map((a) => a.id)));
        for (const r of rows) infoById.set(r.id, r.info);
      } catch {
        /* migrasi 0033 belum dijalankan — tidak ada laporan TV */
      }
    }

    // Protokol TV Android (android_tv_relay/android_tv_adb) disaring di sini, bukan di SQL: enum
    // protocol di skema Drizzle belum menyebut keduanya meski kolomnya teks bebas di database.
    const outletDevices = await db
      .select({ id: devices.id, name: devices.name, protocol: devices.protocol, config: devices.config })
      .from(devices)
      .where(eq(devices.outletId, session.outletId));
    const deviceByIp = new Map<string, { id: string; name: string }>();
    for (const d of outletDevices) {
      if (!String(d.protocol).startsWith("android_tv")) continue;
      try {
        const ip = (JSON.parse(d.config ?? "{}") as { ip?: unknown }).ip;
        if (typeof ip === "string" && ip.trim()) deviceByIp.set(ip.trim(), { id: d.id, name: d.name });
      } catch {
        /* config rusak — dilewati */
      }
    }

    const tvs = [];
    for (const a of agents) {
      const { tvs: reported, reportedAt } = parseStoredTvs(infoById.get(a.id));
      for (const tv of reported) {
        const existing = deviceByIp.get(tv.ip) ?? null;
        tvs.push({
          ...tv,
          agentId: a.id,
          agentName: a.name,
          agentOnline: a.status === "online",
          reportedAt,
          suggestedName: defaultTvDeviceName(tv),
          added: !!existing,
          deviceName: existing?.name ?? null,
        });
      }
    }

    return NextResponse.json({
      canManage,
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        agentVersion: a.agentVersion,
        supportsSetup: parseStoredCapabilities(a.capabilities).includes("tv_setup"),
      })),
      tvs,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
