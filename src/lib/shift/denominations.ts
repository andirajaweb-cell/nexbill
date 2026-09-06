import { PAYMENT_METHOD_LABEL } from "@/lib/payments/labels";
import { formatMoney, DEFAULT_CURRENCY, type OutletCurrency } from "@/lib/currency/format";

/**
 * Physical note/coin denominations for the shift-close cash count — every value gets its own qty
 * row instead of one lump "actual cash" number, so a shortage/overage is traceable to a specific
 * denomination and the count has to be a plausible physical reality, not just a typed-in figure.
 * Shared between the server (closeShift/updateShiftDetail validation) and the client (the count
 * form), so the two can never drift out of sync.
 *
 * Keyed by ISO 4217 currency code (matches lib/currency/format.ts's OutletCurrency.code, which is
 * itself derived from outlets.outletCountry) so an outlet outside Indonesia counts its own
 * region's actual circulating notes/coins instead of IDR ones. Sub-unit coins (sen/centavo/etc)
 * are deliberately left out — several are already rarely used in daily cash transactions across
 * the region, and this app's monetary values are treated as whole numbers everywhere else, so
 * mixing in fractional denominations here would need decimal handling this codebase doesn't have.
 * Figures are a best-effort snapshot of each currency's common circulating notes/coins — treat as
 * approximate and update here if an outlet reports a mismatch with what's actually in local
 * circulation.
 */
export const DENOMINATIONS_BY_CURRENCY: Record<string, readonly number[]> = {
  IDR: [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100],
  MYR: [100, 50, 20, 10, 5, 1],
  SGD: [100, 50, 10, 5, 2, 1],
  BND: [100, 50, 10, 5, 2, 1],
  THB: [1000, 500, 100, 50, 20, 10, 5, 2, 1],
  PHP: [1000, 500, 200, 100, 50, 20, 10, 5, 1],
  VND: [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000],
  KHR: [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500, 100],
  LAK: [100000, 50000, 20000, 10000, 5000, 2000, 1000, 500],
  MMK: [10000, 5000, 1000, 500, 200, 100, 50],
};

/** Back-compat default — most existing call sites predate multi-currency and always meant IDR. */
export const CASH_DENOMINATIONS = DENOMINATIONS_BY_CURRENCY.IDR;

export function getCashDenominations(currencyCode?: string | null): readonly number[] {
  if (!currencyCode) return CASH_DENOMINATIONS;
  return DENOMINATIONS_BY_CURRENCY[currencyCode.toUpperCase()] ?? CASH_DENOMINATIONS;
}

export function denominationLabel(value: number, currency: OutletCurrency = DEFAULT_CURRENCY): string {
  return formatMoney(value, currency);
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
