import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { getOutletLocalAgents } from "@/lib/relay/local-config-service";

/**
 * Kontrol Lokal saat internet putus (lib/relay/local-control.ts) untuk halaman Kontrol Perangkat:
 * per Relay Agent — apakah versinya sudah mendukung, alamat halaman lokalnya di WiFi outlet, PIN-nya,
 * dan unit mana yang tercakup / tidak beserta alasannya. Kunci API agent TIDAK pernah dikirim di
 * sini; PIN hanya untuk role pengelola perangkat.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const canManage = hasPermission(session.role as StaffRole, "manage_devices");
    const agents = await getOutletLocalAgents(session.outletId);
    return NextResponse.json({
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        agentVersion: a.agentVersion,
        supportsLocal: a.supportsLocal,
        urls: (a.localInfo?.addresses ?? []).map((ip) => `http://${ip}:${a.localInfo!.port}`),
        pin: canManage ? a.pin : null,
        covered: a.covered.map((u) => ({ id: u.id, name: u.name, kind: u.device.kind })),
        uncovered: a.uncovered,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
