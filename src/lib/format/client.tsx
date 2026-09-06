"use client";
import { useMemo } from "react";
import { useAuth } from "@/lib/auth/client";
import { formatNumber, DEFAULT_NUMBER_FORMAT } from "./number";
import { formatDate, formatDateTime, DEFAULT_DATE_FORMAT, type DateFormatStyle } from "./date";

/**
 * Client-side access to the outlet's number/date display preferences (Settings > Preferensi >
 * Format Lainnya). Reads decimalStyle/decimalPlaces/dateFormat off useAuth()'s user object, which
 * /api/auth/me resolves fresh from the outlets table — same pattern as useCurrency() in
 * lib/currency/client.tsx (read the doc comment there for why "read fresh, not from the JWT").
 *
 * Usage: `const { formatNumber, formatDate, formatDateTime } = useOutletFormat();` then call them
 * in place of an inline `n.toLocaleString(...)` / `new Date(x).toLocaleDateString(...)`.
 */
export function useOutletFormat() {
  const { user } = useAuth();
  const numberPrefs = useMemo(
    () => ({
      decimalStyle: (user?.decimalStyle as "id" | "us") ?? DEFAULT_NUMBER_FORMAT.decimalStyle,
      decimalPlaces: user?.decimalPlaces ?? DEFAULT_NUMBER_FORMAT.decimalPlaces,
    }),
    [user?.decimalStyle, user?.decimalPlaces]
  );
  const dateStyle: DateFormatStyle = (user?.dateFormat as DateFormatStyle) ?? DEFAULT_DATE_FORMAT;

  return {
    formatNumber: (n: number) => formatNumber(n, numberPrefs),
    formatDate: (input: string | number | Date | null | undefined) => formatDate(input, dateStyle),
    formatDateTime: (input: string | number | Date | null | undefined) => formatDateTime(input, dateStyle),
  };
}
