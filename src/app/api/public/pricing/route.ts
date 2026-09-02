import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { marketRiskCurrencies, subscriptionPlans } from "@/db/schema";
import { describeError } from "@/lib/api/error";
import { LANG_TO_CURRENCY_CODE, convertIdrToCurrency, effectiveRateIdrPerUnit } from "@/lib/market-risk/currency";
import type { LangCode } from "@/lib/i18n/registry";

// Public, unauthenticated — powers the landing page's #harga (PRICING) section, per explicit
// request to hook that section up to platform-admin's real plan data + the market-risk currency
// system instead of the hardcoded "Rp249.000" literals landing-i18n.tsx has always used (see the
// comment at the top of that file). Only ever GET, only ever active rows, and only the fields the
// public pricing card actually needs — nothing here that isn't already meant to be shown to an
// anonymous visitor.
//
// Every price is pre-converted server-side into every supported language's currency (see
// SUPPORTED_LANGS/LANG_TO_CURRENCY_CODE below) so the client never needs its own copy of the
// conversion logic or a second round-trip once the language switcher changes lang — it already
// has every language's numbers up front, keyed by lang code.
//
// Fallback behavior (explicit product decision): if a language's currency has no usable rate yet
// in market-risk (freshly added, never refreshed, no manual override — see
// effectiveRateIdrPerUnit's own doc comment), that language's entry falls back to the plan's
// original IDR pricing rather than omitting a price or showing an error. `fallback: true` on that
// entry tells the client this happened, in case it ever wants to do something different with it
// later (e.g. a small note), but for now the agreed behavior is just "show Rp instead".
const SUPPORTED_LANGS: LangCode[] = ["id", "en", "ms", "th", "vi", "fil"];

const PRICE_FIELDS = ["priceOriginal", "priceCurrent", "extraConsolePrice", "smartPlugPrice", "setupServicePrice"] as const;
type PriceFields = Record<(typeof PRICE_FIELDS)[number], number>;

interface LangPricing extends PriceFields {
  currency: string;
  fallback: boolean;
}

export async function GET() {
  try {
    const [plans, currencyRows] = await Promise.all([
      db
        .select({
          code: subscriptionPlans.code,
          name: subscriptionPlans.name,
          priceOriginal: subscriptionPlans.priceOriginal,
          priceCurrent: subscriptionPlans.priceCurrent,
          includedConsoles: subscriptionPlans.includedConsoles,
          extraConsolePrice: subscriptionPlans.extraConsolePrice,
          smartPlugPrice: subscriptionPlans.smartPlugPrice,
          setupServicePrice: subscriptionPlans.setupServicePrice,
          unlimitedEntitlement: subscriptionPlans.unlimitedEntitlement,
        })
        .from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(asc(subscriptionPlans.sortOrder)),
      db.select().from(marketRiskCurrencies).where(eq(marketRiskCurrencies.isActive, true)),
    ]);

    const rateByCurrencyCode = new Map<string, number | null>();
    for (const row of currencyRows) rateByCurrencyCode.set(row.code, effectiveRateIdrPerUnit(row));

    const result = plans.map((plan) => {
      const byLang: Partial<Record<LangCode, LangPricing>> = {};
      for (const lang of SUPPORTED_LANGS) {
        const currencyCode = LANG_TO_CURRENCY_CODE[lang]; // undefined for "id" — IDR is the base
        const rate = currencyCode ? rateByCurrencyCode.get(currencyCode) : undefined;
        if (!currencyCode || !rate) {
          byLang[lang] = {
            currency: "IDR",
            fallback: Boolean(currencyCode), // "id" itself isn't a fallback, it's just the base
            priceOriginal: plan.priceOriginal,
            priceCurrent: plan.priceCurrent,
            extraConsolePrice: plan.extraConsolePrice,
            smartPlugPrice: plan.smartPlugPrice,
            setupServicePrice: plan.setupServicePrice,
          };
        } else {
          byLang[lang] = {
            currency: currencyCode,
            fallback: false,
            priceOriginal: convertIdrToCurrency(plan.priceOriginal, rate),
            priceCurrent: convertIdrToCurrency(plan.priceCurrent, rate),
            extraConsolePrice: convertIdrToCurrency(plan.extraConsolePrice, rate),
            smartPlugPrice: convertIdrToCurrency(plan.smartPlugPrice, rate),
            setupServicePrice: convertIdrToCurrency(plan.setupServicePrice, rate),
          };
        }
      }
      return {
        code: plan.code,
        name: plan.name,
        includedConsoles: plan.includedConsoles,
        unlimitedEntitlement: plan.unlimitedEntitlement,
        byLang,
      };
    });

    return NextResponse.json({ plans: result });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
