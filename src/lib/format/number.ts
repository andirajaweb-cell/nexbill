/**
 * Outlet display-format preferences for plain numbers (NOT currency amounts — see
 * lib/currency/format.ts's formatMoney for those, which is driven by outlet country/currency
 * instead). Set in Settings > Preferensi > Format Lainnya.
 *
 * decimalStyle picks the thousands/decimal separator convention:
 *   "id" — 1.234,56 (dot thousands, comma decimal — Indonesia/EU convention)
 *   "us" — 1,234.56 (comma thousands, dot decimal — US/UK convention)
 * decimalPlaces is how many digits to show after the separator (0-4 in the Settings UI, but this
 * function accepts anything toLocaleString does).
 */
export type DecimalStyle = "id" | "us";

export interface NumberFormatPrefs {
  decimalStyle: DecimalStyle;
  decimalPlaces: number;
}

export const DEFAULT_NUMBER_FORMAT: NumberFormatPrefs = { decimalStyle: "id", decimalPlaces: 0 };

export function formatNumber(n: number, prefs: NumberFormatPrefs = DEFAULT_NUMBER_FORMAT): string {
  const locale = prefs.decimalStyle === "us" ? "en-US" : "id-ID";
  const places = Math.max(0, Math.min(4, Math.round(prefs.decimalPlaces ?? 0)));
  return (n ?? 0).toLocaleString(locale, { minimumFractionDigits: places, maximumFractionDigits: places });
}
