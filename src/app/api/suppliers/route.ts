import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { createSupplier, listSuppliersWithUsage } from "@/lib/inventory/suppliers";

/**
 * Supplier outlet yang login, TERMASUK yang diarsipkan (archivedAt terisi) — riwayat transaksi lama
 * tetap butuh namanya. Layar pilihan (Belanja Supplier, PO, Expense, Aset) menyaring yang
 * diarsipkan sendiri. usageCount = jumlah transaksi yang memakai supplier itu.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await listSuppliersWithUsage(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_inventory_purchasing")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola supplier." }, { status: 403 });
    }
    const body = await req.json();
    return NextResponse.json(await createSupplier(session.outletId, body, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
