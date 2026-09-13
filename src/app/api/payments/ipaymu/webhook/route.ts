import { NextRequest, NextResponse } from "next/server";
import { normalizeIpaymuCallback, verifyIpaymuWebhookSignature, mapIpaymuCallbackStatus } from "@/lib/payments/adapters/ipaymu";
import { markPaymentByProviderRef } from "@/lib/payments";

/**
 * iPaymu Callback (webhook) for POS/rental order payments — every ipaymu_* gateway in
 * lib/payments/adapters/ipaymu.ts (Direct API channels + the hosted/crossborder Redirect flow)
 * points IPAYMU_NOTIFY_URL here. Distinct from /api/subscription/webhook/ipaymu, which updates
 * subscriptionInvoices for NEXBILL's own platform billing, not outlet `orders`/`payments`.
 *
 * Rewritten from a previous version of this route that had NO signature verification at all
 * (anyone who guessed/found this URL could POST a fake "paid" notification for any order id) and
 * looked up the payment to update by a broken match on orders.id instead of the actual payment's
 * providerRef — fixed to use the same verify-then-markPaymentByProviderRef pattern every other
 * gateway's webhook in this codebase already uses (see webhook/fastpay/route.ts), which is also
 * what makes this idempotent against iPaymu's automatic retries (docs.ipaymu.com/id/docs/callback
 * explicitly warns callbacks WILL be retried until you respond 200).
 *
 * Configure the callback content-type (form-urlencoded — default — or JSON) in the iPaymu
 * dashboard under Integration > Settings; this route accepts either.
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
    console.error("iPaymu webhook: invalid signature", { referenceId: normalized.reference_id });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Direct API payments (ipaymu_qris, ipaymu_va_*, etc.) store providerRef as the numeric
  // TransactionId (trx_id here); the Redirect flow (ipaymu_hosted/ipaymu_crossborder) stores it
  // as the SessionID instead (sid here) — the callback carries both, so try each in turn rather
  // than assuming which flow this payment came from.
  const candidateRefs = [normalized.trx_id, normalized.sid].filter((v) => v !== undefined && v !== null && v !== "").map(String);
  if (candidateRefs.length === 0) {
    // Signature was valid but there's nothing to act on — still 200 so iPaymu doesn't retry forever.
    return NextResponse.json({ ok: true });
  }

  const status = mapIpaymuCallbackStatus(Number(normalized.status_code));
  if (status === "success" || status === "failed") {
    for (const ref of candidateRefs) {
      const updated = await markPaymentByProviderRef(ref, status);
      if (updated) break;
    }
  }
  // status === "pending" (e.g. an intermediate/escrow notification): nothing to update yet, wait
  // for the next callback — never overwrite an existing terminal payment status with "pending".

  return NextResponse.json({ ok: true });
}
