"use client";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/client";
import { currencyForCountry, formatMoney as formatMoneyRaw, type OutletCurrency } from "./format";

/**
 * Client-side access to the current outlet's display currency (symbol/locale only — see the
 * doc comment on lib/currency/format.ts for why this never converts real amounts). Reads
 * outletCountry off useAuth()'s user object, which /api/auth/me already resolves fresh from the
 * outlets table on every page load — no extra fetch needed here.
 *
 * Usage: replace a page's local `const rupiah = (n) => \`Rp${...}\`` helper with
 * `const { formatMoney } = useCurrency();` and call `formatMoney(n)` the same way.
 */
export function useCurrency(): { currency: OutletCurrency; formatMoney: (amount: number) => string } {
  const { user } = useAuth();
  const currency = useMemo(() => currencyForCountry(user?.outletCountry), [user?.outletCountry]);
  const formatMoney = useMemo(() => (amount: number) => formatMoneyRaw(amount, currency), [currency]);
  return { currency, formatMoney };
}
