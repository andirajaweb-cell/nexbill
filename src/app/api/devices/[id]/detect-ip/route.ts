import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { devices } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { requestState } from "@/lib/devices/mqtt-client";
import { parseTasmotaStatusNetIp, withTasmotaLocalIp } from "@/lib/relay/local-control";

/**
 * Mendeteksi IP lokal plug Tasmota lewat MQTT (`Status 5` → stat/<topic>/STATUS5) dan menyimpannya
 * di devices.config.localIp. IP itulah yang dipakai NexbillAgent untuk menyalakan/mematikan plug
 * lewat WiFi saat internet outlet putus (lib/relay/local-control.ts). Plug harus sedang online.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah perangkat." }, { status: 403 });
    }
    const { id } = await params;
    const [device] = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
    if (!device || device.outletId !== session.outletId) return NextResponse.json({ error: "Perangkat tidak ditemukan." }, { status: 404 });
    if (device.protocol !== "tasmota_mqtt" || !device.mqttTopic) {
      return NextResponse.json({ error: "Deteksi IP otomatis hanya untuk smart plug Tasmota (MQTT)." }, { status: 400 });
    }
    let payload: string;
    try {
      payload = await requestState(`stat/${device.mqttTopic}/STATUS5`, `cmnd/${device.mqttTopic}/STATUS`, "5", 5000);
    } catch {
      return NextResponse.json(
        { error: "Smart plug tidak membalas. Pastikan plug menyala dan tersambung ke internet, lalu coba lagi — atau isi IP-nya manual." },
        { status: 504 }
      );
    }
    const ip = parseTasmotaStatusNetIp(payload);
    if (!ip) return NextResponse.json({ error: "Smart plug membalas, tetapi alamat IP lokalnya tidak terbaca. Isi IP-nya manual." }, { status: 422 });
    const [updated] = await db.update(devices).set({ config: withTasmotaLocalIp(device.config, ip) }).where(eq(devices.id, id)).returning();
    return NextResponse.json({ ip, device: updated });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
