import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { relayAgents, devices } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** Platform-admin delete of a relay agent pairing — same guard as the outlet-facing route it replaces (blocks delete while a device still references it). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;

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
        { error: "Relay agent ini masih dipakai oleh salah satu perangkat outlet. Pindahkan perangkat itu ke agent lain dulu sebelum menghapus." },
        { status: 400 }
      );
    }

    await db.delete(relayAgents).where(eq(relayAgents.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
