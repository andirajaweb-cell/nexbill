import { NextRequest, NextResponse } from "next/server";
import { verifyIpaymuWebhookSignature } from "@/lib/payments/adapters/ipaymu-crossborder";
import { applyInvoiceWebhookStatus } from "@/lib/subscription/service";

/**
 * iPaymu notification endpoint for subscription billing (ipaymu_crossborder + ipaymu_hosted —
 * see lib/subscription/service.ts's initiateInvoicePayment). Distinct from
 * /api/payments/ipaymu/webhook, which updates POS `orders`/`payments`, not `subscriptionInvoices`.
 * Register this URL as IPAYMU_NOTIFY_URL in your .env / iPaymu merchant dashboard. TODO: confirm
 * the exact payload field names + signature header name against real iPaymu docs (see comments in
 * lib/payments/adapters/ipaymu-crossborder.ts) before relying on this for real money.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-ipaymu-signature") ?? req.headers.get("signature");

  if (!verifyIpaymuWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    // iPaymu's notification is sometimes form-encoded rather than JSON — TODO: confirm actual
    // content-type against real account before going live; falling through with an empty payload
    // just results in a no-op below rather than a 500.
  }

  const providerRef = (payload.trx_id ?? payload.TransactionId ?? payload.reference_id ?? payload.sid) as string | undefined;
  const statusRaw = String(payload.status ?? payload.Status ?? payload.status_code ?? "").toLowerCase();
  const status = statusRaw === "berhasil" || statusRaw === "success" || statusRaw === "1" ? "success" : "failed";

  if (providerRef) await applyInvoiceWebhookStatus(providerRef, status);
  return NextResponse.json({ ok: true });
}
