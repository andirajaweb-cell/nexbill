import { outletDay, outletTimeHHmm } from "@/lib/time/outlet-time";

/**
 * Aturan tarif per jam (happy hour / jam malam / weekend) — MURNI: tanpa `db`, aman untuk komponen
 * klien. Dipakai server (computeEffectiveHourlyRate di pricing.ts) DAN Mode Offline kasir rental
 * (lib/offline/engine.ts), supaya perkiraan tagihan yang dihitung perangkat saat internet putus
 * memakai aturan yang persis sama dengan yang nanti dihitung server saat sinkron.
 */

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface PricingRuleInput {
  name: string;
  consoleType: string;
  daysOfWeek: string;
  startTime: string;
  endTime: string;
  rateType: "multiplier" | "fixed";
  rateValue: number;
  priority: number;
  isActive?: boolean;
}

/**
 * True if `nowTime` falls inside a rule's [startTime, endTime] window on the day it applies to.
 * Handles overnight windows that cross midnight (e.g. "22:00"–"02:00" for a jam malam rate that
 * runs past 12) as well as ordinary same-day windows:
 *
 *  - Same-day window (startTime <= endTime, e.g. "08:00"–"17:00"): matches when the rule's day is
 *    today AND nowTime falls between start and end, same as before.
 *  - Overnight window (startTime > endTime, e.g. "22:00"–"02:00"): the rule's daysOfWeek names the
 *    day the window STARTS on (so "Jumat 22:00–02:00" naturally covers Friday night through
 *    Saturday 2am, without also having to list Saturday). It matches in two situations: the
 *    evening portion (rule's day is today, nowTime >= startTime), or the early-morning tail
 *    portion (rule's day was YESTERDAY, nowTime <= endTime) — that second case is what the old
 *    single `nowTime >= start && nowTime <= end` check could never satisfy, since no time string
 *    is both >= "22:00" and <= "02:00".
 */
export function ruleMatchesNow(rule: { daysOfWeek: string; startTime: string; endTime: string }, dayCode: string, prevDayCode: string, nowTime: string): boolean {
  const days = rule.daysOfWeek.split(",").map((d) => d.trim());
  const overnight = rule.startTime > rule.endTime;
  if (!overnight) {
    return days.includes(dayCode) && nowTime >= rule.startTime && nowTime <= rule.endTime;
  }
  const eveningPortion = days.includes(dayCode) && nowTime >= rule.startTime;
  const morningPortion = days.includes(prevDayCode) && nowTime <= rule.endTime;
  return eveningPortion || morningPortion;
}

/** Highest-priority active rule that applies to this unit at `at` (outlet-local day/time), or null. */
export function pickPricingRule<R extends PricingRuleInput>(unit: { consoleType: string }, rules: R[], at: Date): R | null {
  const dayCode = DAY_CODES[outletDay(at)];
  const prevDayCode = DAY_CODES[(outletDay(at) + 6) % 7];
  const nowTime = outletTimeHHmm(at);
  const matching = rules
    .filter((r) => r.isActive !== false)
    .filter((r) => r.consoleType === "any" || r.consoleType === unit.consoleType)
    .filter((r) => ruleMatchesNow(r, dayCode, prevDayCode, nowTime))
    .sort((a, b) => b.priority - a.priority);
  return matching[0] ?? null;
}

/** Hourly rate after the best matching rule (before any membership discount). */
export function ruleRateFor(baseRate: number, rule: PricingRuleInput | null): number {
  if (!rule) return baseRate;
  return rule.rateType === "fixed" ? rule.rateValue : Math.round(baseRate * rule.rateValue);
}
