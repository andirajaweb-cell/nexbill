import { NextRequest, NextResponse } from "next/server";
import { importProductsFromWorkbook } from "@/lib/inventory/import";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin import produk." }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) return NextResponse.json({ error: "File Excel wajib diupload." }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const summary = await importProductsFromWorkbook(session.outletId, Buffer.from(arrayBuffer));
    return NextResponse.json(summary);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
