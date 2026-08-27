/**
 * Home Rental duration-tiered pricing — covers every rental duration the owner actually sells by:
 * sewa ~12 jam, sewa 24 jam (harian), sewa 2-3 hari (multi-hari, tarif tambahan per hari), sewa
 * mingguan (7 hari), dan tarif "tambahan 1 hari" untuk hari ke-2 dst pada booking multi-hari yang
 * belum genap 7 hari. Applies identically to a single product or a package (both share the same
 * rate fields: dailyRate/overnightRate/weeklyRate/extraDayRate).
 *
 * Every extra rate is OPTIONAL — an item that only has dailyRate set behaves exactly like the
 * pre-existing "dailyRate x jumlah hari" formula (zero regression for outlets that don't bother
 * filling in the new fields).
 */

export interface RateInputs {
  dailyRate: number;
  overnightRate?: number | null; // sewa ~12 jam
  weeklyRate?: number | null; // sewa mingguan (7 hari)
  extraDayRate?: number | null; // tarif tambahan per hari ke-2 dst
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface RentalFeeResult {
  fee: number;
  durationHours: number;
  days: number; // billed days (0 if the ~12 jam tier applied instead)
  tier: "12h" | "weekly" | "daily";
}

/** Whole calendar days between two ISO timestamps, minimum 1 — same rounding rule the booking form has always used ("mulai jam berapa pun, tetap dihitung minimal 1 hari"). */
export function daysBetweenIso(start: string, end: string): number {
  return Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS));
}

/** Core duration-tiered fee calculation — see file doc comment for the tier rules. */
export function computeRentalFee(rates: RateInputs, scheduledStart: string, scheduledEnd: string): RentalFeeResult {
  const durationMs = Math.max(0, new Date(scheduledEnd).getTime() - new Date(scheduledStart).getTime());
  const durationHours = durationMs / HOUR_MS;

  if (rates.overnightRate && rates.overnightRate > 0 && durationHours <= 12) {
    return { fee: rates.overnightRate, durationHours, days: 0, tier: "12h" };
  }

  const days = Math.max(1, Math.ceil(durationMs / DAY_MS));
  const extraRate = rates.extraDayRate && rates.extraDayRate > 0 ? rates.extraDayRate : rates.dailyRate;

  if (rates.weeklyRate && rates.weeklyRate > 0 && days >= 7) {
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    const fee = weeks * rates.weeklyRate + remDays * extraRate;
    return { fee, durationHours, days, tier: "weekly" };
  }

  const fee = rates.dailyRate + Math.max(0, days - 1) * extraRate;
  return { fee, durationHours, days, tier: "daily" };
}
