import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { createTuyaAccount, listTuyaAccounts } from "@/lib/devices/tuya-accounts-service";

/**
 * Daftar & tambah akun Tuya Cloud API outlet (beberapa akun per outlet — akun Trial Tuya hanya
 * bisa mengontrol sedikit perangkat). Secret tidak pernah dikirim balik, hanya disamarkan.
 * GET: semua staf yang login (dipakai juga oleh form Kontrol Perangkat untuk memilih akun).
 * POST: hanya pemegang izin manage_settings.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await listTuyaAccounts(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah pengaturan." }, { status: 403 });
    }
    const id = await createTuyaAccount(session.outletId, await req.json());
    return NextResponse.json({ id });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
