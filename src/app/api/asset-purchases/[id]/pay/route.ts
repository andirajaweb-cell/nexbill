import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { assetPurchases } from "@/db/schema";
import { payAssetPurchase } from "@/lib/accounting/asset-purchase";

/** Bayar (lunasi/cicil) utang Pembelian Aset — dipakai tab Pembelian Aset dan Accounting → Utang. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedRow<typeof assetPurchases.$inferSelect>(assetPurchases, id, "Pembelian aset tidak ditemukan.");
    const role = session.role as StaffRole;
    if (!hasPermission(role, "manage_assets") && !hasPermission(role, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membayar utang aset." }, { status: 403 });
    }
    const { amount, method, cashBankAccountId } = await req.json();
    return NextResponse.json(await payAssetPurchase({ outletId: session.outletId, purchaseId: id, amount, method, cashBankAccountId, staffUserId: session.sub }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
