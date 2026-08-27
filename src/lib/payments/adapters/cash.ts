import { PaymentGateway, PaymentRequest, PaymentResult } from "../types";
import { randomUUID } from "crypto";

/** Cash isn't "processed" by any gateway — kasir marks it success manually at the till. */
export const cashGateway: PaymentGateway = {
  method: "cash",
  async createPayment(req: PaymentRequest): Promise<PaymentResult> {
    return {
      providerRef: `CASH-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: "pending", // flips to success via POST /api/payments/:id/confirm-cash
      feeAmount: 0,
    };
  },
};
