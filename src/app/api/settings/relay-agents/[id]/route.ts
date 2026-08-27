import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { relayAgents, devices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus relay agent." }, { status: 403 });
    }
    const { id } = await params;
    const [existingAgent] = await db.select().from(relayAgents).where(eq(relayAgents.id, id)).limit(1);
    if (!existingAgent || existingAgent.outletId !== session.outletId) return NextResponse.json({ error: "Relay agent tidak ditemukan." }, { status: 404 });

    // Guard: block delete while any device still references this agent, so a TV
    // doesn't silently lose its control path. Devices store the agent id inside
    // their JSON config, so this is a text scan rather than a real FK check.
    const allDevices = await db.select().from(devices).where(eq(devices.protocol, "android_tv_relay" as any));
    const inUse = allDevices.some((d) => {
      try {
        return d.config && JSON.parse(d.config).relayAgentId === id;
      } catch {
        return false;
      }
    });
    if (inUse) {
      return NextResponse.json(
        { error: "Relay agent ini masih dipakai oleh salah satu perangkat. Ubah perangkat itu ke agent lain dulu sebelum menghapus." },
        { status: 400 }
      );
    }

    await db.delete(relayAgents).where(eq(relayAgents.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
