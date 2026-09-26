import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { createAssetPurchase, listAssetPurchases } from "@/lib/accounting/asset-purchase";

/** Daftar Pembelian Aset outlet yang sedang login (outlet selalu dari sesi, tidak pernah dari query). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await listAssetPurchases(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola aset." }, { status: 403 });
    }
    const body = await req.json();
    const result = await createAssetPurchase({
      outletId: session.outletId,
      staffUserId: session.sub,
      supplierId: body.supplierId,
      invoiceNumber: body.invoiceNumber,
      purchaseDate: body.purchaseDate,
      dueDate: body.dueDate,
      items: body.items,
      additionalCost: body.additionalCost,
      funding: body.funding,
      cashBankAccountId: body.cashBankAccountId,
      paymentMethod: body.paymentMethod,
      paidNow: body.paidNow,
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
