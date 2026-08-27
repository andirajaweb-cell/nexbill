import { NextRequest, NextResponse } from "next/server";
import { getBillBreakdown } from "@/lib/pos/bill";
import { requireOwnedOrder } from "@/lib/pos/order-guard";
import { describeError, errorStatus } from "@/lib/api/error";

/** Full unified-bill view: order + all items + Rental/F&B/misc subtotals — used by the invoice screen and the live billing board. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedOrder(id);
    const breakdown = await getBillBreakdown(id);
    if (!breakdown) return NextResponse.json({ error: "Bill tidak ditemukan." }, { status: 404 });
    return NextResponse.json(breakdown);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
