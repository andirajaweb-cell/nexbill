import { NextRequest, NextResponse } from "next/server";
import { updateBillCheckoutOptions } from "@/lib/pos/bill";
import { requireOwnedOrder } from "@/lib/pos/order-guard";
import { describeError, errorStatus } from "@/lib/api/error";

/** Apply discount/voucher/tax/service-charge to a bill right before payment — used once the rental has stopped (or anytime for a walk-in order) and the kasir is ready to close out. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedOrder(id);
    const body = await req.json();
    const updated = await updateBillCheckoutOptions(id, body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
