import { PAYMENT_METHOD_LABEL } from "@/lib/payments/labels";

/**
 * Standard IDR cash denominations for the physical shift-close count — every
 * note/coin value gets its own qty row instead of one lump "actual cash"
 * number, so a shortage/overage is traceable to a specific denomination and
 * the count has to be a plausible physical reality, not just a typed-in
 * figure. Shared between the server (closeShift validation) and the client
 * (the count form), so the two can never drift out of sync.
 */
export const CASH_DENOMINATIONS = [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100] as const;

export function denominationLabel(value: number): string {
  return value >= 1000 ? `Rp${(value / 1000).toLocaleString("id-ID")}.000` : `Rp${value}`;
}

/**
 * Non-cash payment channels that carry a real, checkable app/dashboard
 * balance (GoPay Merchant, DANA Merchant, BukuPay, Fastpay Gateway) — for
 * these, the cashier types in what the app shows and the system compares it
 * to the expected cumulative GL balance. QRIS/Card/Transfer settle straight
 * to a bank account with no separate balance to check, so they're shown as
 * read-only info instead of requiring a manual entry.
 */
export const BALANCE_TRACKED_METHODS = new Set(["gopay", "dana", "bukupay", "fastpay_h2h"]);
export const INFO_ONLY_METHODS = new Set(["qris", "card", "transfer"]);

export const CHANNEL_LABEL: Record<string, string> = {
  ...PAYMENT_METHOD_LABEL,
  ppob_fastpay_saldo: "Saldo Deposit Fastpay (PPOB)",
};
