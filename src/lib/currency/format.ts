/**
 * Outlet display-currency formatting — SYMBOL/FORMAT ONLY, never a real exchange-rate
 * conversion. The underlying number stored/computed everywhere in this app (POS prices, journal
 * amounts, reports, etc.) stays exactly as entered; this only changes which currency symbol and
 * number-grouping locale wraps it on screen, based on the outlet's own country (see
 * outlets.outletCountry, set in Settings > Business & Tax and at signup in /daftar).
 *
 * This is deliberately separate from lib/market-risk/currency.ts, which DOES convert real amounts
 * using live exchange rates — but only for platform-billing invoices (what an outlet pays NEXBILL
 * for its subscription), driven by outlets.preferredLang. That system answers "what currency does
 * this outlet pay NEXBILL in"; this one answers "what currency symbol does this outlet's own POS
 * show ITS OWN customers" — two different questions that must not be conflated. An outlet's real
 * operational currency (what it actually charges customers) is a business decision NEXBILL has no
 * authority to convert; relabeling is a safe, mechanical UI change while true conversion would
 * require auditing every stored amount for consistency.
 */

export interface OutletCurrency {
  /** ISO 4217 code, for reference/display only (not used to look up an exchange rate here). */
  code: string;
  /** Symbol/prefix shown before the amount, e.g. "Rp", "RM", "₱". */
  symbol: string;
  /** BCP 47 locale used for toLocaleString() digit-grouping (e.g. "10.000" vs "10,000"). */
  locale: string;
}

/** Keyed by ISO 3166-1 alpha-2 country code — matches SEA_BANKS / outlets.outletCountry. */
export const COUNTRY_CURRENCY: Record<string, OutletCurrency> = {
  ID: { code: "IDR", symbol: "Rp", locale: "id-ID" },
  MY: { code: "MYR", symbol: "RM", locale: "ms-MY" },
  SG: { code: "SGD", symbol: "S$", locale: "en-SG" },
  TH: { code: "THB", symbol: "฿", locale: "th-TH" },
  PH: { code: "PHP", symbol: "₱", locale: "en-PH" },
  VN: { code: "VND", symbol: "₫", locale: "vi-VN" },
  BN: { code: "BND", symbol: "B$", locale: "ms-BN" },
  KH: { code: "KHR", symbol: "៛", locale: "km-KH" },
  LA: { code: "LAK", symbol: "₭", locale: "lo-LA" },
  MM: { code: "MMK", symbol: "K", locale: "my-MM" },
};

/** IDR — NEXBILL's own base assumption and the fallback for an outlet with no country set yet (the common case for existing outlets predating this setting). */
export const DEFAULT_CURRENCY: OutletCurrency = COUNTRY_CURRENCY.ID;

export function currencyForCountry(countryCode: string | null | undefined): OutletCurrency {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[countryCode.toUpperCase()] ?? DEFAULT_CURRENCY;
}

/** Same rounding/grouping behavior every existing local `rupiah()` helper used, just with the outlet's own symbol/locale instead of a hardcoded "Rp"/"id-ID". */
export function formatMoney(amount: number, currency: OutletCurrency = DEFAULT_CURRENCY): string {
  const n = Math.round(amount ?? 0);
  return `${currency.symbol}${n.toLocaleString(currency.locale)}`;
}
