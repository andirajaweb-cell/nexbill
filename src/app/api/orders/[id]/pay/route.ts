import { NextRequest, NextResponse } from "next/server";
import { initiatePayment, getOrderPaymentSummary } from "@/lib/payments";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnedOrder } from "@/lib/pos/order-guard";
import { describeError, errorStatus } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";
import { resolveDrawerShiftId } from "@/lib/shift/drawer";

/**
 * Initiates one payment against an order. Supports split/partial payment: pass
 * `amount` to charge less than the full remaining balance (e.g. cash+QRIS split) —
 * omit it to default to whatever's still owed. `initiatePayment` rejects amounts
 * that exceed the remaining balance, so this can be called repeatedly per bill.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { method, customerPhone, amount } = await req.json();

  let order;
  try {
    ({ order } = await requireOwnedOrder(id));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 401) });
  }
  if (order.status === "cancelled") return NextResponse.json({ error: "Order sudah dibatalkan." }, { status: 400 });

  const summary = await getOrderPaymentSummary(id);
  // "Lunas" is decided by the money actually received, not by the status label. An order can carry
  // status "paid" while still having a balance (e.g. marked paid by an older flow with no success
  // payment behind it) — its Piutang then showed in the Piutang tab, but every "Terima Bayar"
  // bounced with "Order sudah lunas" and the receivable could never be collected.
  if (order.status === "paid" && (summary?.remaining ?? 0) <= 0.5) return NextResponse.json({ error: "Order sudah lunas." }, { status: 400 });
  const chargeAmount = amount ?? summary?.remaining ?? order.total;

  try {
    const session = await getSession();
    const payment = await initiatePayment({
      orderId: id,
      amount: chargeAmount,
      method,
      customerPhone,
      description: `Pembayaran order ${id}`,
      // Server-resolved — the drawer that actually takes this money (see resolveDrawerShiftId).
      shiftId: await resolveDrawerShiftId(order.outletId, session?.sub),
    });
    await db.update(orders).set({ status: "awaiting_payment" }).where(eq(orders.id, id));
    return NextResponse.json(payment);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
