import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { devices, rentalUnits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { assertDeviceAllowed } from "@/lib/subscription/service";

/** Mirrors the same check in POST /api/devices — see that file's doc comment for why mqttTopic
 * must be unique across every outlet, not just this one (all outlets share one MQTT broker). */
async function assertMqttTopicGloballyUnique(topic: string, excludeDeviceId?: string) {
  const rows = await db.select({ id: devices.id }).from(devices).where(and(eq(devices.protocol, "tasmota_mqtt"), eq(devices.mqttTopic, topic)));
  const collides = rows.some((r) => r.id !== excludeDeviceId);
  if (collides) {
    throw new Error(
      `MQTT Topic "${topic}" sudah dipakai perangkat lain (outlet manapun) di broker yang sama — semua outlet NEXBILL berbagi satu broker MQTT, jadi topic harus unik secara global. Coba tambahkan nama outlet/lokasi ke topic, mis. "outletanda_${topic}".`
    );
  }
}

const EDITABLE_FIELDS = ["name", "protocol", "mqttTopic", "httpOnUrl", "httpOffUrl", "httpStatusUrl", "config"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah perangkat." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
    // 404 (not 403) if it's missing OR belongs to a different outlet — never let one outlet edit another's device.
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Perangkat tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
    if (typeof patch.protocol === "string") {
      await assertDeviceAllowed(session.outletId, patch.protocol as any, id, session.role);
    }
    const effectiveProtocol = (patch.protocol as string | undefined) ?? existing.protocol;
    const effectiveTopic = (patch.mqttTopic as string | undefined) ?? existing.mqttTopic;
    if (effectiveProtocol === "tasmota_mqtt" && effectiveTopic) {
      await assertMqttTopicGloballyUnique(effectiveTopic, id);
    }
    const [updated] = await db.update(devices).set(patch).where(eq(devices.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Perangkat tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Unassigns this device from any rental unit before deleting, so no rental unit is left pointing at a dangling device id. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus perangkat." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
    // 404 (not 403) if it's missing OR belongs to a different outlet — never let one outlet delete another's device.
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Perangkat tidak ditemukan." }, { status: 404 });
    await db.update(rentalUnits).set({ deviceId: null }).where(eq(rentalUnits.deviceId, id));
    const [deleted] = await db.delete(devices).where(eq(devices.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Perangkat tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
