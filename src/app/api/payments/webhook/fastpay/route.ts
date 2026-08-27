import { NextRequest, NextResponse } from "next/server";
import { verifyFastpayWebhookSignature } from "@/lib/payments/adapters/fastpay";
import { markPaymentByProviderRef } from "@/lib/payments";

/**
 * Fastpay H2H payment notification endpoint.
 * Register this URL as your callback_url in the Fastpay merchant dashboard:
 *   https://yourdomain.com/api/payments/webhook/fastpay
 * TODO: confirm the exact payload field names + signature header name against
 * your Fastpay H2H docs (see comments in lib/payments/adapters/fastpay.ts).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-fastpay-signature");

  if (!verifyFastpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const providerRef = payload.trx_id ?? payload.transaction_id ?? payload.ref_id;
  const status = payload.status === "success" || payload.status === "paid" ? "success" : "failed";

  await markPaymentByProviderRef(providerRef, status);
  return NextResponse.json({ ok: true });
}
