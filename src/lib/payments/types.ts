/** The built-in channels — kept only so editors still autocomplete them. */
export type KnownPaymentMethod =
  | "cash"
  | "qris"
  | "fastpay_h2h"
  | "dana"
  | "gopay"
  | "bukupay"
  | "transfer"
  | "card"
  // iPaymu Direct API channels (lib/payments/adapters/ipaymu.ts) — an outlet opts into any of
  // these by adding a matching row (same `key`) to its own Pembayaran (paymentMethods) catalog;
  // nothing else needs to change for a new one to start working, see resolveGateway in index.ts.
  | "ipaymu_qris"
  | "ipaymu_va_bca"
  | "ipaymu_va_bni"
  | "ipaymu_va_mandiri"
  | "ipaymu_va_bri"
  | "ipaymu_va_permata"
  | "ipaymu_dana"
  | "ipaymu_shopeepay"
  | "ipaymu_alfamart"
  | "ipaymu_indomaret"
  // iPaymu hosted checkout page (customer picks channel on iPaymu's own site) and cross-border
  // card acceptance — both use the Redirect Payment endpoint, see the same adapter file.
  | "ipaymu_hosted"
  | "ipaymu_crossborder";

/** Bank-specific virtual account channels — used by the NEXBILL platform-billing flow
 * (subscription invoices, smart plug purchase) via fastpayGateway, see adapters/fastpay.ts. */
export type VaBankMethod = "va_bca" | "va_bni" | "va_mandiri" | "va_bri" | "va_permata";

/**
 * A payment method key is now an owner-editable catalog entry (see the
 * paymentMethods table / Pembayaran dashboard page), not a fixed set — so this
 * accepts any string while the `KnownPaymentMethod` union still surfaces
 * autocomplete for the 8 built-ins. Every custom key an owner adds routes
 * through the generic fallbacks in payments/index.ts (manual/staff-confirmed
 * gateway) and account-mapping.ts (generic GL account resolution), so nothing
 * downstream needs to recognize a new key by name to work correctly.
 */
export type PaymentMethod = KnownPaymentMethod | (string & {});

export interface PaymentRequest {
  orderId: string;
  /** Always the IDR amount actually charged/settled — for cross-border checkouts (see
   * lib/payments/adapters/ipaymu-crossborder.ts) this is the foreign-currency quoted price
   * already converted to IDR via lib/market-risk/currency.ts, NOT the foreign-currency figure
   * itself. iPaymu's cross-border offering is international card acceptance settled in IDR; the
   * card network/issuer handles the actual currency conversion at charge time, not iPaymu. */
  amount: number;
  method: PaymentMethod;
  customerPhone?: string;
  description?: string;
  /** Cross-border display only (receipt/description text) — the ISO 4217 code the customer saw
   * the price quoted in (e.g. "MYR"), from marketRiskCurrencies.code. Never sent to a gateway as
   * the charged amount; purely cosmetic on top of `amount`, which stays IDR. */
  displayCurrencyCode?: string;
  /** Cross-border display only — the foreign-currency figure the customer saw quoted, computed
   * from `amount` via convertIdrToCurrency(). Same "cosmetic only" caveat as displayCurrencyCode. */
  displayAmount?: number;
  /** Set by initiatePayment/recordDeposit before calling the gateway — lets adapters (fastpay.ts's
   * mock QRIS path, manual.ts) look up the outlet's configured feePercent via
   * lib/accounting/payment-fee.ts resolvePaymentFee() and return a real feeAmount instead of a
   * hardcoded placeholder. Optional because some call sites (e.g. platform-billing's
   * ipaymu-crossborder, which isn't outlet-scoped) never set it. */
  outletId?: string;
}

export interface PaymentResult {
  providerRef: string;
  status: "pending" | "success" | "failed";
  qrString?: string;
  qrImageUrl?: string;
  /** Virtual account number the payer transfers to, for va_* methods. */
  vaNumber?: string;
  /** Bank code the VA number belongs to (bca/bni/mandiri/bri/permata), for va_* methods. */
  bankCode?: string;
  /** Redirect/checkout link the payer needs to open to finish paying — iPaymu's hosted checkout
   * page (ipaymu_hosted/ipaymu_crossborder) and Direct API QRIS/e-wallet/cstore/cc channels all
   * return one of these (iPaymu's `Data.Url`) instead of a raw qrString. Not yet rendered as a
   * clickable link/QR in the POS/rental "Bayar" screen — that UI only knows qrImageUrl/vaNumber
   * today, so a channel that ONLY returns checkoutUrl (no vaNumber) needs that follow-up before a
   * cashier can actually complete a transaction with it end-to-end. */
  checkoutUrl?: string;
  feeAmount?: number;
  expiresAt?: string;
  rawResponse?: unknown;
}

export interface PaymentGateway {
  method: PaymentMethod;
  /** Create/initiate a payment. For cash this resolves instantly as "pending" until staff confirms cash received. */
  createPayment(req: PaymentRequest): Promise<PaymentResult>;
  /** Optional: check status by polling (some gateways don't push webhooks reliably). */
  checkStatus?(providerRef: string): Promise<PaymentResult["status"]>;
}
