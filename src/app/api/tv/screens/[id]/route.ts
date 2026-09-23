import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { deleteTvScreen, regenerateTvPairingCode, updateTvScreen } from "@/lib/tv/service";

/**
 * Ubah satu layar, atau buat ulang kode pairing-nya.
 *
 * Setiap fungsi service di bawah menerima session.outletId dan MENYERTAKANNYA di klausa WHERE —
 * bukan sekadar memeriksanya lebih dulu. Dengan begitu, id layar milik outlet lain tidak
 * menghasilkan "ditolak" melainkan "tidak ditemukan", dan tidak ada celah antara pemeriksaan dan
 * perubahan.
 *
 * Izin manage_settings diperiksa DI SERVER (ditambahkan 2026-09-23). Versi pertama hanya memeriksa
 * login, sementara halaman Pengaturan menyembunyikan tombolnya dari role tanpa izin — yang berarti
 * kasir mana pun tetap bisa memanggil route ini langsung dan menghapus layar atau membuat kode
 * pairing baru. Menyembunyikan tombol bukan kontrol akses.
 */
function forbidden() {
  return NextResponse.json({ error: "Role kamu tidak punya izin mengelola layar TV." }, { status: 403 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) return forbidden();

    const { id } = await params;
    const body = await req.json();

    if (body.action === "regenerate_code") {
      const row = await regenerateTvPairingCode(session.outletId, id);
      return NextResponse.json({ pairingCode: row.pairingCode, pairingCodeExpiresAt: row.pairingCodeExpiresAt });
    }

    const row = await updateTvScreen(session.outletId, id, {
      name: body.name,
      rentalUnitId: body.rentalUnitId,
      isActive: body.isActive,
    });
    return NextResponse.json({ id: row.id, name: row.name, rentalUnitId: row.rentalUnitId, isActive: row.isActive });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) return forbidden();

    const { id } = await params;
    await deleteTvScreen(session.outletId, id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
