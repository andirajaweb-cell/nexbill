import { PaymentGateway } from "../types";
import { fastpayGateway } from "./fastpay";

/**
 * DANA and GoPay are routed through the same Fastpay H2H aggregator
 * (product_code switches automatically based on req.method — see fastpay.ts).
 * If you later get a direct DANA/GoPay merchant account, swap these for
 * dedicated adapters implementing the same PaymentGateway interface.
 */
export const danaGateway: PaymentGateway = {
  method: "dana",
  createPayment: (req) => fastpayGateway.createPayment(req),
  checkStatus: (ref) => fastpayGateway.checkStatus!(ref),
};

export const gopayGateway: PaymentGateway = {
  method: "gopay",
  createPayment: (req) => fastpayGateway.createPayment(req),
  checkStatus: (ref) => fastpayGateway.checkStatus!(ref),
};
