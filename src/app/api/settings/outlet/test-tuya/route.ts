import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { testTuyaConnection } from "@/lib/devices/adapters/tuya";
import { describeError } from "@/lib/api/error";

/**
 * Powers the "Terhubung"/"Tidak terhubung" indicator on Settings > Integrasi Tuya Cloud API —
 * actually requests a fresh Tuya access token using the outlet's saved credentials, rather than
 * just checking whether the fields are non-empty (a saved-but-wrong Access ID/Secret still looks
 * "filled in"). Read-only — never touches any device or session, safe to call as often as the UI
 * wants (page load + a manual "Tes Koneksi" button).
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat pengaturan." }, { status: 403 });
    }
    const result = await testTuyaConnection(session.outletId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, message: describeError(err) }, { status: 200 });
  }
}
