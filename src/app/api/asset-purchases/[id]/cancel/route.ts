import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { assetPurchases } from "@/db/schema";
import { cancelAssetPurchase } from "@/lib/accounting/asset-purchase";

/**
 * Batalkan Pembelian Aset (salah input). Butuh manage_assets DAN approve_expenses — pemisahan tugas
 * yang sama dengan expense: yang mencatat pembelian (mis. akuntan) tidak bisa sekaligus menghapusnya
 * dari pembukuan.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedRow<typeof assetPurchases.$inferSelect>(assetPurchases, id, "Pembelian aset tidak ditemukan.");
    const role = session.role as StaffRole;
    if (!hasPermission(role, "manage_assets") || !hasPermission(role, "approve_expenses")) {
      return NextResponse.json({ error: "Hanya Owner/Manager yang bisa membatalkan pembelian aset." }, { status: 403 });
    }
    const { reason } = await req.json();
    return NextResponse.json(await cancelAssetPurchase({ outletId: session.outletId, purchaseId: id, reason, staffUserId: session.sub }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
