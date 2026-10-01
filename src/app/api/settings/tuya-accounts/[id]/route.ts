import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { deleteTuyaAccount, updateTuyaAccount } from "@/lib/devices/tuya-accounts-service";

/** Ubah / hapus satu akun Tuya. Selalu dibatasi ke outlet sesi — akun outlet lain = "tidak ditemukan". */
async function guard() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) };
  if (!hasPermission(session.role as StaffRole, "manage_settings")) {
    return { error: NextResponse.json({ error: "Role kamu tidak punya izin mengubah pengaturan." }, { status: 403 }) };
  }
  return { session };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    const { id } = await params;
    await updateTuyaAccount(g.session.outletId, id, await req.json());
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    const { id } = await params;
    await deleteTuyaAccount(g.session.outletId, id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
