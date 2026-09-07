/**
 * Outlet-local time helpers — safe regardless of what timezone the Node.js process itself
 * happens to run under.
 *
 * Every stored timestamp in this app is a genuine UTC instant (see `nowIso()` in
 * src/db/schema.ts, `new Date().toISOString()`), which is correct and exactly what should be
 * stored. The bug this file exists to prevent is on the READ side: `new Date(storedUtc).getHours()`
 * doesn't return "the hour at the outlet" — it returns the hour in whatever timezone the server
 * process's OS/container is configured for (UTC on most cloud hosts, including anywhere this app
 * might get deployed besides a manually-configured VPS). That silent mismatch is exactly what
 * made the dashboard's "Transaksi per Jam" and "Jam Ramai vs Jam Sepi" charts (both fed by
 * /api/dashboard/owner's busyHours, previously computed via plain `.getHours()`) show hours that
 * didn't match the real time transactions happened — and the identical bug existed in
 * lib/rental/pricing.ts's day/time-window rule matching (happy hour, jam malam, weekend rates),
 * just silent because a wrong price is much harder to notice than a wrong chart.
 *
 * NEXBILL doesn't yet track a per-outlet IANA timezone column — every outlet today is assumed to
 * be Indonesia/WIB, matching every other Indonesia-first assumption already baked into this
 * codebase (id-ID locale formatting, Rupiah-default pricing, etc). Centralizing the timezone
 * string here means a future real `outlets.timezone` column is a one-line change in this file,
 * not a hunt through every call site that cares about "what hour/day is it at the outlet".
 */
export const OUTLET_TIMEZONE = "Asia/Jakarta";

const HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: OUTLET_TIMEZONE, hour: "2-digit", hour12: false });
const MINUTE_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: OUTLET_TIMEZONE, minute: "2-digit" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: OUTLET_TIMEZONE, weekday: "short" });

// Date.prototype.getDay() convention: 0 = Sunday .. 6 = Saturday — matches DAY_CODES in
// lib/rental/pricing.ts, so outletDay() is a drop-in replacement for `.getDay()`.
const WEEKDAY_TO_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Hour-of-day (0-23) for `date`, in the outlet's timezone — not the server's. `% 24` guards
 * against the documented ICU quirk (older engines) where `hour12: false` can format midnight as
 * "24" instead of "00".
 */
export function outletHour(date: Date): number {
  return Number(HOUR_FORMATTER.format(date)) % 24;
}

/** Minute-of-hour (0-59) for `date`, in the outlet's timezone. */
export function outletMinute(date: Date): number {
  return Number(MINUTE_FORMATTER.format(date));
}

/** Day-of-week for `date` in the outlet's timezone, 0=Sunday..6=Saturday (same as `.getDay()`). */
export function outletDay(date: Date): number {
  const weekday = WEEKDAY_FORMATTER.format(date);
  return WEEKDAY_TO_INDEX[weekday] ?? 0;
}

/** "HH:mm" for `date` in the outlet's timezone — the exact shape pricing rule windows are stored/compared in. */
export function outletTimeHHmm(date: Date): string {
  return `${String(outletHour(date)).padStart(2, "0")}:${String(outletMinute(date)).padStart(2, "0")}`;
}
