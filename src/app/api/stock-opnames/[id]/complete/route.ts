import { NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { completeStockOpname } from "@/lib/inventory/stock-opname";
import { stockOpnames } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { forbidUnless } from "@/lib/auth/require-permission";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedRow(stockOpnames, id, "Stock opname tidak ditemukan.");
    const denied = forbidUnless(session, ["manage_inventory_purchasing"], "Role kamu tidak punya izin menyelesaikan stock opname (selisihnya mengubah stok).");
    if (denied) return denied;
    return NextResponse.json(await completeStockOpname(id));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
