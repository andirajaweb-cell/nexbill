import { PaymentGateway, PaymentRequest, PaymentResult } from "../types";

/**
 * STUB — BukuPay (BukuWarung) merchant payment.
 * Requires a BukuWarung merchant account + API credentials (BukuWarung's
 * merchant/partner API is invite-based for UMKM partners — request access
 * via BukuWarung Business support). Runs in mock mode until configured.
 *
 * ENV:
 *   BUKUPAY_BASE_URL
 *   BUKUPAY_MERCHANT_ID
 *   BUKUPAY_API_KEY
 */
function isConfigured() {
  return Boolean(process.env.BUKUPAY_BASE_URL && process.env.BUKUPAY_MERCHANT_ID && process.env.BUKUPAY_API_KEY);
}

export const bukupayGateway: PaymentGateway = {
  method: "bukupay",
  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    if (!isConfigured()) {
      return {
        providerRef: `MOCK-BP-${Date.now()}`,
        status: "pending",
        feeAmount: 0,
        rawResponse: { mock: true, note: "BUKUPAY_* env vars not set — mock mode." },
      };
    }
    const res = await fetch(`${process.env.BUKUPAY_BASE_URL}/v1/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.BUKUPAY_API_KEY}` },
      body: JSON.stringify({
        merchant_id: process.env.BUKUPAY_MERCHANT_ID,
        amount: req.amount,
        reference: req.orderId,
        description: req.description,
      }),
    });
    if (!res.ok) throw new Error(`BukuPay error ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      providerRef: data.id ?? data.reference,
      status: "pending",
      qrString: data.qr_string,
      qrImageUrl: data.qr_image_url,
      rawResponse: data,
    };
  },
};
