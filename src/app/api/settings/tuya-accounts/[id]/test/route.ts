import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { testTuyaAccount } from "@/lib/devices/adapters/tuya";

/** Tes koneksi satu akun Tuya (meminta access token baru) — untuk badge Terhubung/Tidak terhubung. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat pengaturan." }, { status: 403 });
    }
    const { id } = await params;
    return NextResponse.json(await testTuyaAccount(session.outletId, id));
  } catch (err: unknown) {
    return NextResponse.json({ ok: false, message: describeError(err) }, { status: 200 });
  }
}
