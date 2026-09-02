import crypto from "crypto";
import { PaymentGateway, PaymentRequest, PaymentResult } from "../types";

/**
 * iPaymu Cross-Border adapter — https://ipaymu.com/id/cross-border-transaction/
 *
 * SCOPE OF THIS PASS: this is a SCAFFOLD, not a verified live integration. Per the marketing
 * page (the only iPaymu source reachable from this dev sandbox — no outbound access to
 * https://docs.ipaymu.com was possible here), iPaymu's cross-border product is international
 * VISA/Mastercard card acceptance that still settles to the merchant in IDR — the customer's
 * bank/card network does the actual currency conversion at charge time, iPaymu does not accept
 * or hold foreign currency itself. That is WHY this adapter's `createPayment()` always charges
 * `req.amount` (already-computed IDR), and only uses `req.displayCurrencyCode`/`displayAmount`
 * for cosmetic receipt text — see the comment on PaymentRequest in ../types.ts.
 *
 * The request/response shape below follows iPaymu's commonly published Direct API v2 pattern
 * (POST /api/v2/payment, `va` + `signature` + `timestamp` headers, HMAC-SHA256 signature over
 * "POST:{va}:{sha256(body)}:{apiKey}"). This is a REASONABLE DEFAULT, not confirmed against a
 * real iPaymu merchant account — before going live you MUST:
 *   1. Register as an iPaymu merchant and get a `va` (virtual account / merchant code) + API key
 *      from the iPaymu dashboard, and read the real Direct API docs at https://docs.ipaymu.com.
 *   2. Cross-check every field name below (product/qty/price/buyerName/paymentMethod/
 *      paymentChannel/referenceId/returnUrl/notifyUrl/cancelUrl) and the signature recipe in
 *      buildSignature() against that documentation — field names are placeholders modeled on
 *      iPaymu's publicly documented pattern, same caveat as the Fastpay adapter (adapters/fastpay.ts).
 *   3. Confirm whether cross-border card acceptance requires a different endpoint/paymentMethod
 *      value than iPaymu's domestic methods (their marketing copy suggests it's a `paymentMethod:
 *      "cc"` variant, but this needs confirming with iPaymu support/docs — cross-border is likely
 *      a merchant-account-level feature toggle rather than a distinct API surface).
 *   4. Implement and register the inbound webhook route (POST /api/payments/webhook/ipaymu, not
 *      built in this pass) using verifyIpaymuWebhookSignature() below before trusting any payload.
 *
 * ENV required (see .env.example — "Payment: iPaymu Cross-Border" section):
 *   IPAYMU_BASE_URL     e.g. https://my.ipaymu.com (production) / https://sandbox.ipaymu.com (sandbox)
 *   IPAYMU_VA           merchant virtual account / merchant code from the iPaymu dashboard
 *   IPAYMU_API_KEY      used both as a header and inside the signature
 *   IPAYMU_NOTIFY_URL   webhook URL iPaymu calls on payment status change
 *
 * If these are not set, this adapter runs in MOCK MODE so the platform-admin Market Risk module
 * and subscription checkout flow can be developed/demoed without a live iPaymu account.
 */

function isConfigured() {
  return Boolean(process.env.IPAYMU_BASE_URL && process.env.IPAYMU_VA && process.env.IPAYMU_API_KEY);
}

/** TODO: confirm exact signature recipe against iPaymu Direct API docs (this is a reasonable default: HMAC-SHA256 of "POST:{va}:{sha256(jsonBody)}:{apiKey}", hex digest). */
function buildSignature(va: string, apiKey: string, jsonBody: string): string {
  const bodyHash = crypto.createHash("sha256").update(jsonBody).digest("hex");
  const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
  return crypto.createHmac("sha256", apiKey).update(stringToSign).digest("hex");
}

function mockCreatePayment(req: PaymentRequest, refPrefix: string, note: string): PaymentResult {
  const providerRef = `MOCK-${refPrefix}-${Date.now()}`;
  const displayNote =
    req.displayCurrencyCode && req.displayAmount
      ? ` (ditampilkan ke pelanggan sebagai ${req.displayCurrencyCode} ${req.displayAmount.toFixed(2)})`
      : "";
  return {
    providerRef,
    status: "pending",
    // A real iPaymu Direct API response returns a redirect `Url` to iPaymu's hosted checkout
    // page — represented here as rawResponse.mockCheckoutUrl since PaymentResult has no
    // dedicated redirect-URL field yet (every adapter so far is QR/VA based, not redirect-based;
    // add one if/when this adapter goes live).
    feeAmount: 0,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    rawResponse: {
      mock: true,
      note: `${note}${displayNote}`,
      mockCheckoutUrl: `https://sandbox.ipaymu.com/mock-checkout/${providerRef}`,
    },
  };
}

/**
 * Shared factory behind both exported gateways below — same iPaymu Direct API v2 `/payment`
 * endpoint and signature recipe, the only difference is whether `paymentMethod` locks the checkout
 * to card-only cross-border acceptance ("cc") or is left unset so iPaymu's hosted checkout page
 * shows every domestic channel it has enabled for this merchant (VA, e-wallet, retail/Alfamart,
 * etc — "E-Wallet / Retail" on the Billing page). See the top-of-file caveats: this whole request/
 * response shape is still an unverified scaffold, cross-check against real docs before going live.
 */
function createIpaymuGateway(config: { method: "ipaymu_crossborder" | "ipaymu_hosted"; refPrefix: string; lockToCard: boolean }): PaymentGateway {
  return {
    method: config.method,

    async createPayment(req: PaymentRequest): Promise<PaymentResult> {
      if (!isConfigured()) {
        return mockCreatePayment(
          req,
          config.refPrefix,
          config.lockToCard
            ? "IPAYMU_* env vars not set — using mock cross-border payment for development."
            : "IPAYMU_* env vars not set — using mock hosted checkout (e-wallet/retail) for development."
        );
      }

      const va = process.env.IPAYMU_VA!;
      const apiKey = process.env.IPAYMU_API_KEY!;
      const referenceId = `NEXBILL-${config.lockToCard ? "XB" : "HOSTED"}-${req.orderId}-${Date.now()}`;

      const body: Record<string, unknown> = {
        product: [req.description || `NEXBILL Langganan - ${req.orderId}`],
        qty: [1],
        price: [req.amount], // always IDR — see top-of-file note
        referenceId,
        buyerPhone: req.customerPhone,
        returnUrl: process.env.IPAYMU_RETURN_URL,
        notifyUrl: process.env.IPAYMU_NOTIFY_URL,
        cancelUrl: process.env.IPAYMU_CANCEL_URL,
      };
      // Cross-border card acceptance locks the channel to "cc" — TODO: confirm this is the
      // correct paymentMethod/paymentChannel value with iPaymu docs/support before going live.
      // Hosted checkout (ipaymu_hosted) deliberately omits paymentMethod entirely so iPaymu shows
      // its own channel-picker page (VA/e-wallet/retail) rather than this app guessing one.
      if (config.lockToCard) body.paymentMethod = "cc";

      const jsonBody = JSON.stringify(body);
      const signature = buildSignature(va, apiKey, jsonBody);
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, "")
        .slice(0, 14);

      const res = await fetch(`${process.env.IPAYMU_BASE_URL}/api/v2/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          va,
          signature,
          timestamp,
        },
        body: jsonBody,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`iPaymu error ${res.status}: ${text}`);
      }

      const data = await res.json();
      // Field names below (Data.SessionID/Url/TransactionId) are placeholders modeled on iPaymu's
      // publicly documented v2 response shape — confirm against your real account's response.
      return {
        providerRef: data?.Data?.TransactionId ?? data?.Data?.SessionID ?? referenceId,
        status: "pending",
        feeAmount: data?.Data?.Fee ?? 0,
        expiresAt: data?.Data?.Expired,
        rawResponse: data,
      };
    },

    async checkStatus(providerRef: string) {
      if (!isConfigured()) return "pending";
      const va = process.env.IPAYMU_VA!;
      const apiKey = process.env.IPAYMU_API_KEY!;
      const body = { transactionId: providerRef };
      const jsonBody = JSON.stringify(body);
      const signature = buildSignature(va, apiKey, jsonBody);
      const timestamp = new Date()
        .toISOString()
        .replace(/[-:T.Z]/g, "")
        .slice(0, 14);

      const res = await fetch(`${process.env.IPAYMU_BASE_URL}/api/v2/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json", va, signature, timestamp },
        body: jsonBody,
      });
      if (!res.ok) return "pending";
      const data = await res.json();
      const status = String(data?.Data?.Status ?? data?.Data?.StatusDesc ?? "").toLowerCase();
      if (status === "berhasil" || status === "success" || status === "1") return "success";
      if (status === "gagal" || status === "failed" || status === "cancel" || status === "-2" || status === "-1") return "failed";
      return "pending";
    },
  };
}

export const ipaymuCrossBorderGateway: PaymentGateway = createIpaymuGateway({ method: "ipaymu_crossborder", refPrefix: "IPAYMU-XB", lockToCard: true });

/** Domestic "E-Wallet / Retail" checkout on the Billing page — was previously a dead button (the
 * frontend called doPay(id, "ipaymu_hosted") but no gateway/route ever recognized that method key,
 * so it 400'd). Shares everything with ipaymuCrossBorderGateway except the paymentMethod lock. */
export const ipaymuHostedGateway: PaymentGateway = createIpaymuGateway({ method: "ipaymu_hosted", refPrefix: "IPAYMU-HOSTED", lockToCard: false });

/** Verify inbound webhook signature from iPaymu before trusting the payload. Not yet wired to a
 * route — implement POST /api/payments/webhook/ipaymu and call this first, same pattern as
 * verifyFastpayWebhookSignature in adapters/fastpay.ts. TODO: confirm header name + exact
 * algorithm with iPaymu docs before relying on this for real money. */
export function verifyIpaymuWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!isConfigured()) return true; // mock mode — accept all for local testing
  if (!signatureHeader) return false;
  const va = process.env.IPAYMU_VA!;
  const apiKey = process.env.IPAYMU_API_KEY!;
  const expected = buildSignature(va, apiKey, rawBody);
  return expected === signatureHeader;
}
