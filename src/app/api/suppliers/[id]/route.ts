import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { deleteSupplier, setSupplierArchived, updateSupplier } from "@/lib/inventory/suppliers";

async function authorize() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) };
  if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
    return { error: NextResponse.json({ error: "Role kamu tidak punya izin mengelola supplier." }, { status: 403 }) };
  }
  return { session };
}

/** Edit data supplier, atau `{ archived: true|false }` untuk mengarsipkan / memulihkan. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error } = await authorize();
  if (error) return error;
  try {
    const body = await req.json();
    if (typeof body.archived === "boolean") {
      return NextResponse.json(await setSupplierArchived(session.outletId, id, body.archived, session.sub));
    }
    return NextResponse.json(await updateSupplier(session.outletId, id, body, session.sub));
  } catch (err: unknown) {
    const message = describeError(err);
    return NextResponse.json({ error: message }, { status: message === "Supplier tidak ditemukan." ? 404 : 400 });
  }
}

/** Hapus permanen — ditolak (409) bila supplier sudah dipakai di transaksi mana pun; arsipkan saja. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session, error } = await authorize();
  if (error) return error;
  try {
    return NextResponse.json(await deleteSupplier(session.outletId, id, session.sub));
  } catch (err: unknown) {
    const message = describeError(err);
    return NextResponse.json({ error: message }, { status: message === "Supplier tidak ditemukan." ? 404 : 409 });
  }
}
