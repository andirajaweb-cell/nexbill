import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { assertDeviceAllowed } from "@/lib/subscription/service";
import { claimHardwareUnit } from "@/lib/hardware/units";

/**
 * Zero-config alternative to POST /api/devices for a NEXBILL-branded smart plug (see
 * nexbillHardwareUnits in db/schema.ts) — the outlet types/scans the serial number printed on the
 * unit instead of a protocol + MQTT topic, since the topic was already pre-assigned (and
 * pre-flashed onto the physical unit) at manufacturing time. Still gated by the same
 * trial/subscription rule as a self-supplied Tasmota plug (assertDeviceAllowed) — owning a NEXBILL
 * plug doesn't bypass the "smart plug protocols blocked during trial" rule.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menambah perangkat." }, { status: 403 });
    }
    const body = await req.json();
    const serialNumber = String(body.serialNumber ?? "");
    const name = String(body.name ?? "");
    if (!serialNumber.trim()) return NextResponse.json({ error: "Nomor seri wajib diisi." }, { status: 400 });
    if (!name.trim()) return NextResponse.json({ error: "Nama perangkat wajib diisi." }, { status: 400 });

    await assertDeviceAllowed(session.outletId, "tasmota_mqtt", undefined, session.role);
    const device = await claimHardwareUnit(serialNumber, session.outletId, name);
    return NextResponse.json(device);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
