import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { mergeSupplier } from "@/lib/inventory/suppliers";

/** Gabungkan supplier ini ke `targetId` (semua transaksinya dipindah), lalu hapus supplier ini. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola supplier." }, { status: 403 });
    }
    const { targetId } = await req.json();
    return NextResponse.json(await mergeSupplier(session.outletId, id, String(targetId ?? ""), session.sub));
  } catch (err: unknown) {
    const message = describeError(err);
    return NextResponse.json({ error: message }, { status: message === "Supplier tidak ditemukan." ? 404 : 400 });
  }
}
