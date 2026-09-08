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
/** Asia/Jakarta (WIB) has always been a fixed UTC+7 offset with no DST — safe to hardcode. */
const OUTLET_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

const HOUR_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: OUTLET_TIMEZONE, hour: "2-digit", hour12: false });
const MINUTE_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: OUTLET_TIMEZONE, minute: "2-digit" });
const WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", { timeZone: OUTLET_TIMEZONE, weekday: "short" });
const YMD_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: OUTLET_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

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

/**
 * UTC instant corresponding to 00:00:00 at the outlet, on whatever calendar date `date` falls on
 * IN THE OUTLET'S TIMEZONE. This is the correct "start of today" cutoff for a server-side
 * "revenue/expenses/whatever hari ini" query — plain `new Date(); x.setHours(0, 0, 0, 0)` resets
 * hours in the SERVER PROCESS's own timezone (UTC on most cloud hosts, e.g. Vercel), not the
 * outlet's. On a UTC host that silently shifts the "today" window 7 hours later than the outlet's
 * real midnight — e.g. it was still yesterday 17:00 UTC when the outlet's Jakarta clock struck
 * 00:00 — so anything that happened at the outlet between 00:00-07:00 WIB gets dropped from
 * "today" (counted as still belonging to yesterday's window) while transactions from 00:00-07:00
 * WIB tomorrow wrongly leak into today's window instead. This is exactly what made the owner
 * dashboard's "Pendapatan Hari Ini" undercount versus the Laba Rugi report for "Hari Ini" (that
 * report's period comes from the browser via PeriodPicker.tsx, i.e. the merchant's own local
 * clock, which is correct as long as they're browsing from Indonesia — see resolvePeriodPreset).
 */
export function outletDayStartUtc(date: Date = new Date()): Date {
  const parts = YMD_FORMATTER.formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day"), 0, 0, 0, 0) - OUTLET_UTC_OFFSET_MS);
}

/** UTC instant for the end (exclusive) of the outlet-local calendar day `date` falls on — i.e. `outletDayStartUtc(date)` + 24h. */
export function outletDayEndUtc(date: Date = new Date()): Date {
  return new Date(outletDayStartUtc(date).getTime() + 24 * 60 * 60 * 1000);
}

/**
 * "YYYY-MM-DD" calendar day for `date` IN THE OUTLET'S TIMEZONE — the correct way to ask "is this
 * the same day as that" for two UTC timestamps. A naive `isoString.slice(0, 10)` compares UTC
 * calendar days instead, which is wrong for exactly the same reason `.getHours()` is wrong (see
 * this file's top doc comment): a transaction at 03:46 WIB is 20:46 UTC the PREVIOUS day, so two
 * timestamps a few hours apart in the same WIB morning can land on different UTC dates and look
 * like a "different day" to a naive string-slice comparison even though no merchant would ever
 * see it that way. Added for lib/reports/reconciliation.ts, which was doing exactly that naive
 * slice and consequently flagging same-WIB-day orders as "date_mismatch" whenever one side of the
 * comparison happened to fall in the 00:00-07:00 WIB window.
 */
export function outletDateYmd(date: Date): string {
  return YMD_FORMATTER.format(date);
}
