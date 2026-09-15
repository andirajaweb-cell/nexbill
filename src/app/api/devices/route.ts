import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { devices } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { assertDeviceAllowed } from "@/lib/subscription/service";
import { assertSharedTuyaCapacityAvailable } from "@/lib/devices/adapters/tuya";

/**
 * All outlets share ONE physical MQTT broker (single global MQTT_BROKER_URL env var — see
 * lib/devices/mqtt-client.ts), so mqttTopic isn't just unique-per-outlet, it must be unique
 * ACROSS EVERY OUTLET on the whole platform: if two different outlets both name a plug "plug1",
 * the broker sees identical topics and one outlet's on/off command (or state read) can silently
 * hit the other outlet's physical plug. Checked cross-outlet on purpose (no outletId filter)
 * whenever a device is saved as/edited to "tasmota_mqtt" with a topic set. Rejecting outright,
 * rather than auto-prefixing the topic, is deliberate — the string entered here must match
 * EXACTLY what's configured on the physical Tasmota device's own MQTT topic setting, so silently
 * rewriting it would just move the collision into "why doesn't my plug respond" territory instead.
 */
async function assertMqttTopicGloballyUnique(topic: string, excludeDeviceId?: string) {
  const conditions = [eq(devices.protocol, "tasmota_mqtt"), eq(devices.mqttTopic, topic)];
  const rows = await db.select({ id: devices.id }).from(devices).where(and(...conditions));
  const collides = rows.some((r) => r.id !== excludeDeviceId);
  if (collides) {
    throw new Error(
      `MQTT Topic "${topic}" sudah dipakai perangkat lain (outlet manapun) di broker yang sama — semua outlet NEXBILL berbagi satu broker MQTT, jadi topic harus unik secara global. Coba tambahkan nama outlet/lokasi ke topic, mis. "outletanda_${topic}".`
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId here, this
    // includes device control endpoints.
    const rows = await db.select().from(devices).where(eq(devices.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menambah perangkat." }, { status: 403 });
    }
    const body = await req.json();
    // Trial/subscription gate — smart-plug protocols are blocked pre-purchase,
    // Android-TV-family protocols capped at 1 device during trial. See
    // lib/subscription/service.ts for the full rule set.
    await assertDeviceAllowed(session.outletId, body.protocol, undefined, session.role);
    if (body.protocol === "tasmota_mqtt" && body.mqttTopic) {
      await assertMqttTopicGloballyUnique(body.mqttTopic);
    }
    if (body.protocol === "tuya") {
      await assertSharedTuyaCapacityAvailable(session.outletId);
    }
    // outletId always comes from the session — never trust a client-supplied value, otherwise
    // a device could be created under a different outlet than the one just gated above.
    const [row] = await db.insert(devices).values({ ...body, outletId: session.outletId }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
