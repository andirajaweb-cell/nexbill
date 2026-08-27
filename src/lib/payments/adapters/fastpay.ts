import crypto from "crypto";
import { PaymentGateway, PaymentMethod, PaymentRequest, PaymentResult } from "../types";
import { resolvePaymentFee } from "@/lib/accounting/payment-fee";

/**
 * Fastpay H2H (Host-to-Host) adapter — https://www.fastpay.co.id/h2h/
 *
 * IMPORTANT: Fastpay's exact request/response field names, signature algorithm,
 * and product codes are defined in the H2H technical documentation you receive
 * after signing up as a Fastpay merchant/reseller (they hand you a PDF/Postman
 * collection with your merchant_id + api_key). The shape below follows Fastpay's
 * commonly published H2H pattern (merchant_id + ref_id + signature), but you
 * MUST cross-check field names against your actual Fastpay dashboard docs
 * before going live — search for "signature", "callback/webhook", and
 * "product code" in your Fastpay merchant portal and adjust `buildSignature()`
 * and the payload in `createPayment()` accordingly.
 *
 * ENV required:
 *   FASTPAY_BASE_URL     e.g. https://api.fastpay.co.id
 *   FASTPAY_MERCHANT_ID
 *   FASTPAY_API_KEY
 *   FASTPAY_SECRET_KEY   used to sign requests
 *
 * If these are not set, this adapter runs in MOCK MODE so the rest of the
 * app (POS flow, receipts, chat bot upsell) can be developed/demoed without
 * a live Fastpay account. Mock payments auto-mark as "pending" and can be
 * force-completed from the Payments dashboard for testing.
 */

const PRODUCT_CODE: Partial<Record<PaymentMethod, string>> = {
  qris: "QRIS",
  fastpay_h2h: "QRIS", // generic H2H channel selection defaults to QRIS unless overridden
  dana: "DANA",
  gopay: "GOPAY",
  va_bca: "VA_BCA",
  va_bni: "VA_BNI",
  va_mandiri: "VA_MANDIRI",
  va_bri: "VA_BRI",
  va_permata: "VA_PERMATA",
};

const VA_BANK_CODE: Partial<Record<PaymentMethod, string>> = {
  va_bca: "bca",
  va_bni: "bni",
  va_mandiri: "mandiri",
  va_bri: "bri",
  va_permata: "permata",
};

function isVaMethod(method: PaymentMethod) {
  return typeof method === "string" && method.startsWith("va_");
}

/** Deterministic-looking mock VA number for local dev/demo — a real Fastpay/VA aggregator
 * response would return the actual bank-issued number instead (see createPayment below). */
function mockVaNumber(bankCode: string, orderId: string) {
  const prefix: Record<string, string> = { bca: "39", bni: "8808", mandiri: "88808", bri: "26215", permata: "8529" };
  const digits = orderId.replace(/[^0-9]/g, "").padStart(10, "0").slice(-10);
  return `${prefix[bankCode] ?? "999"}${digits}`;
}

function isConfigured() {
  return Boolean(
    process.env.FASTPAY_BASE_URL && process.env.FASTPAY_MERCHANT_ID && process.env.FASTPAY_API_KEY && process.env.FASTPAY_SECRET_KEY
  );
}

/** TODO: confirm exact signature recipe against Fastpay H2H docs (this is a reasonable default). */
function buildSignature(parts: string[]) {
  const secret = process.env.FASTPAY_SECRET_KEY || "";
  return crypto.createHash("sha256").update(parts.join("") + secret).digest("hex");
}

async function mockCreatePayment(req: PaymentRequest): Promise<PaymentResult> {
  const providerRef = `MOCK-FP-${Date.now()}`;

  if (isVaMethod(req.method)) {
    const bankCode = VA_BANK_CODE[req.method] ?? "bca";
    return {
      providerRef,
      status: "pending",
      vaNumber: mockVaNumber(bankCode, req.orderId),
      bankCode,
      feeAmount: 4000, // typical flat VA admin fee placeholder
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // VA numbers typically live 24h
      rawResponse: { mock: true, note: "FASTPAY_* env vars not set — using mock VA number for development." },
    };
  }

  // Fee: uses the outlet's configured paymentMethods.feePercent for this channel (see
  // lib/accounting/payment-fee.ts) — falls back to the typical QRIS MDR of 0.7% only when the
  // outlet hasn't been resolved (req.outletId unset) or hasn't configured a rate yet.
  const feeAmount = req.outletId
    ? await resolvePaymentFee(req.outletId, req.method, req.amount)
    : Math.round(req.amount * 0.007);

  return {
    providerRef,
    status: "pending",
    qrString: `00020101021226610014ID.CO.QRIS.WWW0215ID10200000000000303UMI51440014ID.CO.QRIS.WWW0215ID102000000000005204581253033605802ID5920POS RENTAL PS (MOCK)6013JAKARTA61051234562070703A0163049999`,
    feeAmount,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    rawResponse: { mock: true, note: "FASTPAY_* env vars not set — using mock QRIS payload for development." },
  };
}

export const fastpayGateway: PaymentGateway = {
  method: "fastpay_h2h",

  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    if (!isConfigured()) return mockCreatePayment(req);

    const merchantId = process.env.FASTPAY_MERCHANT_ID!;
    const refId = `POS-${req.orderId}-${Date.now()}`;
    const productCode = PRODUCT_CODE[req.method] || "QRIS";

    const signature = buildSignature([merchantId, refId, String(req.amount), productCode]);

    const res = await fetch(`${process.env.FASTPAY_BASE_URL}/h2h/transaction/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.FASTPAY_API_KEY}`,
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        ref_id: refId,
        product_code: productCode,
        amount: req.amount,
        customer_phone: req.customerPhone,
        description: req.description || `POS Rental PS - Order ${req.orderId}`,
        callback_url: process.env.FASTPAY_CALLBACK_URL,
        signature,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fastpay H2H error ${res.status}: ${text}`);
    }

    const data = await res.json();

    // Field names below (qr_string, trx_id, fee, expired_at, va_number) are placeholders —
    // map them to whatever your Fastpay response actually returns.
    return {
      providerRef: data.trx_id ?? data.transaction_id ?? refId,
      status: "pending",
      qrString: data.qr_string ?? data.qris_payload,
      qrImageUrl: data.qr_image_url,
      vaNumber: data.va_number ?? data.account_number,
      bankCode: isVaMethod(req.method) ? VA_BANK_CODE[req.method] : undefined,
      feeAmount: data.fee ?? 0,
      expiresAt: data.expired_at,
      rawResponse: data,
    };
  },

  async checkStatus(providerRef: string) {
    if (!isConfigured()) return "pending";
    const merchantId = process.env.FASTPAY_MERCHANT_ID!;
    const signature = buildSignature([merchantId, providerRef]);
    const res = await fetch(
      `${process.env.FASTPAY_BASE_URL}/h2h/transaction/status?merchant_id=${merchantId}&ref_id=${providerRef}&signature=${signature}`,
      { headers: { Authorization: `Bearer ${process.env.FASTPAY_API_KEY}` } }
    );
    if (!res.ok) return "pending";
    const data = await res.json();
    if (data.status === "success" || data.status === "paid") return "success";
    if (data.status === "failed" || data.status === "expired") return "failed";
    return "pending";
  },
};

/** Verify inbound webhook signature from Fastpay before trusting the payload. TODO: confirm header name + algorithm with Fastpay docs. */
export function verifyFastpayWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!isConfigured()) return true; // mock mode — accept all for local testing
  if (!signatureHeader) return false;
  const expected = crypto
    .createHmac("sha256", process.env.FASTPAY_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");
  return expected === signatureHeader;
}
