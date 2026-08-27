import { NextResponse } from "next/server";
import { confirmDeposit } from "@/lib/payments";
import { requireOwnedPayment } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

/**
 * Confirms a pending "bayar di muka" deposit (e.g. QRIS scanned) — distinct
 * from confirm-cash/markPaymentSuccess, which would also trigger
 * settleOrderAfterPayment against the order's still-placeholder total. See
 * confirmDeposit() in lib/payments/index.ts and StartSessionInput.prepay in
 * lib/rental/sessions.ts for the full reasoning.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    await requireOwnedPayment(orderId);
    const payment = await confirmDeposit(orderId);
    return NextResponse.json(payment);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
