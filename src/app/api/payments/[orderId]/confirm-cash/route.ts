import { NextResponse } from "next/server";
import { markPaymentSuccess } from "@/lib/payments";
import { requireOwnedPayment } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    await requireOwnedPayment(orderId);
    const payment = await markPaymentSuccess(orderId);
    return NextResponse.json(payment);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
