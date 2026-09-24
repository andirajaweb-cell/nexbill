import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { closeListing } from "@/lib/marketplace/service";

/**
 * Menutup (menarik) barang dari etalase. Tidak menghapus baris — riwayat kesepakatan yang merujuknya
 * harus tetap terbaca. Body JSON wajib: { alasan: keyof ALASAN_TARIK, catatan?: string }.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_marketplace")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah barang di Marketplace." }, { status: 403 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const row = await closeListing(id, session.outletId, body.alasan, body.catatan, session.sub);
    return NextResponse.json({ ok: true, row });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
