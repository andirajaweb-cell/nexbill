import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { marketRiskCurrencies, outlets } from "@/db/schema";
import type { LangCode } from "@/lib/i18n/registry";

export type MarketRiskCurrency = typeof marketRiskCurrencies.$inferSelect;

/**
 * Which dashboard language a currency's price would key off, once public-facing multi-currency
 * display is built — that display work is explicitly OUT of scope for this pass (the user's own
 * scoping answer was "platform-admin dulu saja"), so nothing reads this map yet. It exists now so
 * that future work (landing page / billing page pricing) has a single place to look up the
 * mapping instead of re-deriving it. "id" (Bahasa Indonesia) has no entry — IDR is NEXBILL's own
 * base currency, not a market-risk-managed foreign currency row.
 */
export const LANG_TO_CURRENCY_CODE: Partial<Record<LangCode, string>> = {
  en: "USD",
  ms: "MYR",
  th: "THB",
  vi: "VND",
  fil: "PHP",
};

/**
 * Resolve the IDR value of 1 unit of a currency, following the precedence documented on the
 * marketRiskCurrencies table: a manual admin override wins outright; otherwise the last-fetched
 * API rate plus the admin's markup% buffer (the actual market-risk control). Returns null when
 * neither is available yet (freshly added currency, never refreshed, no manual rate given) —
 * callers must treat null as "not priceable yet" rather than dividing by it.
 */
export function effectiveRateIdrPerUnit(
  row: Pick<MarketRiskCurrency, "apiRateIdrPerUnit" | "manualRateIdrPerUnit" | "markupPercent">
): number | null {
  if (row.manualRateIdrPerUnit != null && row.manualRateIdrPerUnit > 0) return row.manualRateIdrPerUnit;
  if (row.apiRateIdrPerUnit != null && row.apiRateIdrPerUnit > 0) {
    return row.apiRateIdrPerUnit * (1 + row.markupPercent / 100);
  }
  return null;
}

/** priceIdr / effectiveRate — e.g. Rp249.000 at an effective rate of Rp3.500/MYR ≈ MYR 71.14. */
export function convertIdrToCurrency(priceIdr: number, effectiveRateIdrPerUnitValue: number): number {
  if (!effectiveRateIdrPerUnitValue || effectiveRateIdrPerUnitValue <= 0) return 0;
  return priceIdr / effectiveRateIdrPerUnitValue;
}

/** amount(in currency) * effectiveRate — inverse of convertIdrToCurrency, for completeness. */
export function convertCurrencyToIdr(amountInCurrency: number, effectiveRateIdrPerUnitValue: number): number {
  return amountInCurrency * effectiveRateIdrPerUnitValue;
}

export interface BillingCurrency {
  /** ISO 4217 code the outlet should see/pay platform-billing invoices in, or null for
   * Indonesia/IDR (the base currency — never itself a marketRiskCurrencies row). */
  code: string | null;
  /** Resolved via effectiveRateIdrPerUnit — null when `code` is set but no usable rate exists
   * yet (freshly added currency, never refreshed, no manual override), meaning display/checkout
   * must fall back to IDR until platform-admin sets a rate in /platform-admin/market-risk. */
  effectiveRateIdrPerUnit: number | null;
}

/**
 * What currency an outlet should see/pay platform-billing (subscription invoices) in —
 * "biaya langganan Rp249.000 untuk Indonesia, USD/lainnya untuk mancanegara" per the pricing
 * mechanism agreed with the user. Driven by the outlet's declared preferredLang (Settings >
 * Business & Tax, same field the support-translation feature reuses) via LANG_TO_CURRENCY_CODE
 * — "id" (or an outlet with no mapped currency) always means IDR, no conversion. Used by both
 * /api/subscription (display) and initiateInvoicePayment (routes payment to the iPaymu
 * cross-border adapter) so the two stay in sync.
 */
export async function resolveBillingCurrencyForOutlet(outletId: string): Promise<BillingCurrency> {
  const [outlet] = await db.select({ preferredLang: outlets.preferredLang }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
  const code = outlet?.preferredLang ? LANG_TO_CURRENCY_CODE[outlet.preferredLang as LangCode] : undefined;
  if (!code) return { code: null, effectiveRateIdrPerUnit: null };
  const [row] = await db.select().from(marketRiskCurrencies).where(eq(marketRiskCurrencies.code, code)).limit(1);
  if (!row || !row.isActive) return { code, effectiveRateIdrPerUnit: null };
  return { code, effectiveRateIdrPerUnit: effectiveRateIdrPerUnit(row) };
}

/**
 * Refresh `apiRateIdrPerUnit` for every active currency row from an external FX API.
 *
 * Default provider: open.er-api.com's free, no-API-key "latest/IDR" endpoint, which returns
 * rates FROM 1 IDR TO other currencies (e.g. `rates.USD` = how many USD equals 1 IDR) — inverted
 * below to get "how many IDR per 1 unit of that currency", matching what `apiRateIdrPerUnit`
 * means everywhere else in this module. Override with MARKET_RISK_FX_API_URL in .env for a
 * different provider (must return the same `{ rates: { CODE: number, ... } }` /
 * `{ conversion_rates: {...} }` shape, IDR-based).
 *
 * On a total fetch failure, every existing rate is left untouched (never zeroed out) — a
 * transient FX API outage should never blank out live pricing. Per-currency failures (the API
 * responded but is missing a specific code) are reported individually the same way.
 *
 * NOTE: needs outbound network access to the FX API at runtime. This cannot be exercised inside
 * the dev sandbox used to build this feature (no external network reachability there — the same
 * limitation hit earlier with the Biteship shipping integration); it must be tried in the app's
 * real dev/deploy environment.
 */
export async function refreshRatesFromApi(updatedByPlatformAdminId?: string): Promise<{ updated: string[]; failed: string[] }> {
  const apiUrl = process.env.MARKET_RISK_FX_API_URL || "https://open.er-api.com/v6/latest/IDR";
  const rows = await db.select().from(marketRiskCurrencies).where(eq(marketRiskCurrencies.isActive, true));

  let ratesFromIdr: Record<string, number> | null = null;
  try {
    const res = await fetch(apiUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`FX API error ${res.status}`);
    const data = await res.json();
    ratesFromIdr = data.rates ?? data.conversion_rates ?? null;
    if (!ratesFromIdr) throw new Error("FX API response missing rates/conversion_rates field");
  } catch {
    return { updated: [], failed: rows.map((r) => r.code) };
  }

  const updated: string[] = [];
  const failed: string[] = [];
  const now = new Date().toISOString();

  for (const row of rows) {
    const rateFromIdr = ratesFromIdr[row.code]; // 1 IDR = rateFromIdr units of row.code
    if (!rateFromIdr || rateFromIdr <= 0) {
      failed.push(row.code);
      continue;
    }
    const idrPerUnit = 1 / rateFromIdr;
    await db
      .update(marketRiskCurrencies)
      .set({
        apiRateIdrPerUnit: idrPerUnit,
        lastFetchedAt: now,
        updatedAt: now,
        ...(updatedByPlatformAdminId ? { updatedBy: updatedByPlatformAdminId } : {}),
      })
      .where(eq(marketRiskCurrencies.id, row.id));
    updated.push(row.code);
  }

  return { updated, failed };
}
