import { PaymentGateway, PaymentMethod, PaymentRequest, PaymentResult } from "../types";
import { randomUUID } from "crypto";
import { resolvePaymentFee } from "@/lib/accounting/payment-fee";

/** Manual/offline payment methods (transfer bank manual, kartu debit/kredit via mesin EDC terpisah,
 * plus any custom channel an owner adds) — kasir konfirmasi manual, tidak lewat gateway online.
 * Fee defaults to 0 (unchanged behavior) unless the outlet configured a feePercent for this
 * channel's key (e.g. an EDC card fee) via the Pembayaran page — see lib/accounting/payment-fee.ts. */
export function manualGateway(method: PaymentMethod, prefix: string): PaymentGateway {
  return {
    method,
    async createPayment(req: PaymentRequest): Promise<PaymentResult> {
      const feeAmount = req.outletId ? await resolvePaymentFee(req.outletId, req.method, req.amount) : 0;
      return {
        providerRef: `${prefix}-${randomUUID().slice(0, 8).toUpperCase()}`,
        status: "pending",
        feeAmount,
      };
    },
  };
}
