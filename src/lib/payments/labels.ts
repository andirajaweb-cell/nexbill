import type { PaymentMethod } from "./types";

/**
 * Canonical, user-facing "app name" label for every payment channel — single
 * source of truth shared by the billing checkout picker (POS/Rental), the
 * auto-created cash/bank GL account names (accounting/account-mapping.ts),
 * and the shift-closing non-cash balance verification labels
 * (shift/denominations.ts) — so the same channel is always called the same
 * thing everywhere in the app instead of three pages drifting into three
 * different names for "GoPay".
 */
export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Tunai (Cash)",
  qris: "QRIS",
  fastpay_h2h: "Fastpay (Gateway)",
  dana: "DANA",
  gopay: "GoPay",
  bukupay: "BukuPay",
  transfer: "Transfer Bank",
  card: "Kartu Debit/Kredit (EDC)",
};

/** Every payment method, in a stable display order, ready to drop into a <select>/button-group. */
export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = (
  Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]
).map((value) => ({ value, label: PAYMENT_METHOD_LABEL[value] }));
