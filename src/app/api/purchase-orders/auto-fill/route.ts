import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { autoFillLowStockPurchaseOrders } from "@/lib/inventory/auto-po";

/**
 * Manual trigger for "Cek & Buat PO Otomatis" on the Purchase Order tab — also called
 * automatically after a stock adjustment (POST /api/inventory) or a completed stock opname
 * (completeStockOpname), so this route mainly exists for the case a product crossed its minimum
 * via a POS sale (sale_out), which doesn't call it directly to keep the checkout path lean.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const result = await autoFillLowStockPurchaseOrders(session.outletId);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
