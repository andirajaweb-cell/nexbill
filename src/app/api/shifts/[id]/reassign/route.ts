import { NextRequest, NextResponse } from "next/server";
import { shifts } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";
import { reassignShiftStaff } from "@/lib/shift/shift";

/**
 * Ganti Kasir — kasir memakai akun yang salah saat membuka shift. Owner/Superuser saja (sama
 * dengan Edit/Hapus riwayat shift), karena mengubah atribusi transaksi di jejak audit.
 * Body: { staffUserId: string, reason: string }.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedRow(shifts, id, "Shift tidak ditemukan.");
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa mengganti kasir shift." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    if (typeof body?.staffUserId !== "string" || !body.staffUserId) {
      return NextResponse.json({ error: "Pilih akun kasir yang benar." }, { status: 400 });
    }
    const result = await reassignShiftStaff({
      shiftId: id,
      toStaffUserId: body.staffUserId,
      reason: typeof body.reason === "string" ? body.reason : "",
      actorStaffUserId: session.sub,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
