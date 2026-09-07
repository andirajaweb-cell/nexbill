import { db } from "@/db/client";
import { pricingRules, customers, membershipTiers, rentalUnits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { outletDay, outletTimeHHmm } from "@/lib/time/outlet-time";

const DAY_CODES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface RateBreakdown {
  baseRate: number;
  appliedRuleName: string | null;
  ruleRate: number;
  memberTierName: string | null;
  memberDiscountPercent: number;
  finalRate: number;
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
function ruleMatchesNow(rule: { daysOfWeek: string; startTime: string; endTime: string }, dayCode: string, prevDayCode: string, nowTime: string): boolean {
  const days = rule.daysOfWeek.split(",").map((d) => d.trim());
  const overnight = rule.startTime > rule.endTime;
  if (!overnight) {
    return days.includes(dayCode) && nowTime >= rule.startTime && nowTime <= rule.endTime;
  }
  const eveningPortion = days.includes(dayCode) && nowTime >= rule.startTime;
  const morningPortion = days.includes(prevDayCode) && nowTime <= rule.endTime;
  return eveningPortion || morningPortion;
}

/**
 * Resolve the effective hourly rate for a unit right now, applying the
 * highest-priority matching pricing rule (happy hour / weekend / jam malam)
 * then stacking the customer's membership discount on top.
 *
 * Rate is locked in at session start (not recomputed mid-session) — the
 * common real-world convention, and avoids the complexity of splitting a
 * running timer across multiple rate segments.
 *
 * Note: day/time matching uses outletHour()/outletDay() (src/lib/time/outlet-time.ts), NOT the
 * server's ambient clock — `at` is a real UTC instant, and plain `.getHours()`/`.getDay()` on it
 * would silently read back the SERVER's own timezone instead of the outlet's (WIB) whenever the
 * app happens to run on a host set to UTC, which is the default on most cloud hosts. That exact
 * bug is what made the dashboard's busy-hours charts show the wrong hour; the fix here is the
 * same one, applied to pricing rule matching (happy hour / jam malam / weekend rates) so a wrong
 * server timezone can't silently apply the wrong rate window too. Overnight windows that cross
 * midnight (e.g. 22:00–02:00) ARE supported — see ruleMatchesNow() above; a rule's daysOfWeek
 * names the day the window starts on.
 */
export async function computeEffectiveHourlyRate(
  outletId: string,
  rentalUnitId: string,
  customerId?: string | null,
  at: Date = new Date()
): Promise<RateBreakdown> {
  const [unit] = await db.select().from(rentalUnits).where(eq(rentalUnits.id, rentalUnitId)).limit(1);
  if (!unit) throw new Error("Unit rental tidak ditemukan.");

  const baseRate = unit.hourlyRate;
  const dayCode = DAY_CODES[outletDay(at)];
  const prevDayCode = DAY_CODES[(outletDay(at) + 6) % 7];
  const nowTime = outletTimeHHmm(at);

  const rules = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.outletId, outletId), eq(pricingRules.isActive, true)));

  const matching = rules
    .filter((r) => r.consoleType === "any" || r.consoleType === unit.consoleType)
    .filter((r) => ruleMatchesNow(r, dayCode, prevDayCode, nowTime))
    .sort((a, b) => b.priority - a.priority);

  const bestRule = matching[0];
  const ruleRate = bestRule ? (bestRule.rateType === "fixed" ? bestRule.rateValue : Math.round(baseRate * bestRule.rateValue)) : baseRate;

  let memberTierName: string | null = null;
  let memberDiscountPercent = 0;
  if (customerId) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (customer?.membershipTierId) {
      const [tier] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, customer.membershipTierId)).limit(1);
      if (tier) {
        memberTierName = tier.name;
        memberDiscountPercent = tier.discountPercent;
      }
    }
  }

  const finalRate = Math.round(ruleRate * (1 - memberDiscountPercent / 100));

  return {
    baseRate,
    appliedRuleName: bestRule?.name ?? null,
    ruleRate,
    memberTierName,
    memberDiscountPercent,
    finalRate,
  };
}

/** Round minutes up to the nearest billing increment (e.g. 15 min) — never rounds down. */
export function roundUpMinutes(minutes: number, incrementMinutes: number): number {
  if (incrementMinutes <= 0) return Math.ceil(minutes);
  return Math.ceil(minutes / incrementMinutes) * incrementMinutes;
}
