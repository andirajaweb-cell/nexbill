import { NextRequest, NextResponse } from "next/server";
import { normalizeIpaymuCallback, verifyIpaymuWebhookSignature } from "@/lib/payments/adapters/ipaymu";
import { applyInvoiceWebhookStatus } from "@/lib/subscription/service";

/**
 * iPaymu notification endpoint for subscription billing (ipaymu_crossborder + ipaymu_hosted —
 * see lib/subscription/service.ts's initiateInvoicePayment). Distinct from
 * /api/payments/ipaymu/webhook, which updates POS `orders`/`payments`, not `subscriptionInvoices`.
 * Register this URL as IPAYMU_NOTIFY_URL in your .env / iPaymu merchant dashboard's callback
 * setting (either content-type — form-urlencoded or JSON — both accepted).
 *
 * Previously used a raw-string signature check against IPAYMU_API_KEY and only looked for a
 * `x-ipaymu-signature`/`signature` header — both wrong per docs.ipaymu.com/id/docs/callback: the
 * header is `X-Signature`, and the secret is the merchant's VA number (see the doc comment on
 * verifyIpaymuWebhookSignature in lib/payments/adapters/ipaymu.ts), not the API key. Fixed here to
 * match /api/payments/ipaymu/webhook's verification exactly.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let payload: Record<string, unknown>;

  if (contentType.includes("application/json")) {
    payload = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData().catch(() => null);
    payload = {};
    if (form) for (const [key, value] of form.entries()) payload[key] = value;
  }

  const normalized = normalizeIpaymuCallback(payload);
  const signature = req.headers.get("x-signature") ?? req.headers.get("X-Signature");

  if (!verifyIpaymuWebhookSignature(normalized, signature)) {
    console.error("iPaymu subscription webhook: invalid signature", { referenceId: normalized.reference_id });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Subscription invoices pay via the Redirect flow (ipaymu_hosted/ipaymu_crossborder), which
  // stores providerRef as the SessionID (sid) — but try trx_id too in case a future subscription
  // flow ever switches to a Direct-API channel, same defensive pattern as the POS webhook.
  const candidateRefs = [normalized.trx_id, normalized.sid].filter((v) => v !== undefined && v !== null && v !== "").map(String);
  const statusCode = Number(normalized.status_code);
  const status = statusCode === 1 || statusCode === 6 ? "success" : statusCode === 0 ? null : "failed";

  if (status) {
    for (const ref of candidateRefs) {
      await applyInvoiceWebhookStatus(ref, status);
    }
  }

  return NextResponse.json({ ok: true });
}
