import { NextRequest, NextResponse } from "next/server";
import { updateBillCheckoutOptions } from "@/lib/pos/bill";
import { requireOwnedOrder } from "@/lib/pos/order-guard";
import { describeError, errorStatus } from "@/lib/api/error";
import { guardManualDiscount, logManualDiscount } from "@/lib/pos/discount-guard";

/** Apply discount/voucher/tax/service-charge to a bill right before payment — used once the rental has stopped (or anytime for a walk-in order) and the kasir is ready to close out. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, order } = await requireOwnedOrder(id);
    const body = await req.json();
    const manualDiscount = Number(body.discount ?? 0) || 0;
    const changed = body.discount !== undefined && manualDiscount !== order.discount;
    if (changed) {
      await guardManualDiscount({ outletId: order.outletId, staffUserId: session.sub, role: session.role, manualDiscount, subtotal: order.subtotal, orderId: id });
    }
    const updated = await updateBillCheckoutOptions(id, body);
    if (changed) await logManualDiscount({ outletId: order.outletId, staffUserId: session.sub, manualDiscount, subtotal: order.subtotal, orderId: id });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
