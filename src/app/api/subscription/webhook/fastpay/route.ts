import { NextRequest, NextResponse } from "next/server";
import { verifyFastpayWebhookSignature } from "@/lib/payments/adapters/fastpay";
import { applyInvoiceWebhookStatus } from "@/lib/subscription/service";

/**
 * Fastpay H2H notification endpoint for SUBSCRIPTION billing (QRIS/VA invoices paid via
 * fastpayGateway — see lib/subscription/service.ts's initiateInvoicePayment). Distinct from
 * /api/payments/webhook/fastpay, which updates POS `orders`/`payments`, not `subscriptionInvoices`
 * — the two are deliberately separate endpoints/tables (subscription billing is NEXBILL's own
 * revenue, never mixed into an outlet's own accounting journal). Register this URL as a SECOND
 * callback_url (or route by product code) in the Fastpay merchant dashboard if platform billing
 * and POS payments need different notification handling; until then this is additive — a payload
 * for a POS order's providerRef simply matches nothing in subscriptionInvoices and no-ops here.
 * TODO: confirm exact payload field names + signature header name against your Fastpay H2H docs
 * (see comments in lib/payments/adapters/fastpay.ts) before relying on this for real money.
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

  if (providerRef) await applyInvoiceWebhookStatus(providerRef, status);
  return NextResponse.json({ ok: true });
}
