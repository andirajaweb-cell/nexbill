import { NextResponse } from "next/server";
import { markPaymentSuccess } from "@/lib/payments";
import { authorizeManualConfirmation } from "@/lib/payments/manual-confirm";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  try {
    // Non-cash needs a reference; records who confirmed and their drawer shift — see authorizeManualConfirmation.
    const confirmation = await authorizeManualConfirmation(orderId, await req.json().catch(() => null));
    const payment = await markPaymentSuccess(orderId, confirmation);
    return NextResponse.json(payment);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
