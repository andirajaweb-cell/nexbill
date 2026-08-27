import { db } from "@/db/client";
import { pricingRules, customers, membershipTiers, rentalUnits } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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
 * Resolve the effective hourly rate for a unit right now, applying the
 * highest-priority matching pricing rule (happy hour / weekend / jam malam)
 * then stacking the customer's membership discount on top.
 *
 * Rate is locked in at session start (not recomputed mid-session) — the
 * common real-world convention, and avoids the complexity of splitting a
 * running timer across multiple rate segments.
 *
 * Note: day/time matching uses the server's local clock. This assumes the
 * app runs on a machine physically at (or in the same timezone as) the
 * outlet — true for the typical single-outlet self-hosted setup this
 * project targets. Overnight windows that cross midnight (e.g. 22:00–02:00)
 * are NOT supported yet — split them into two rules (22:00–23:59 and
 * 00:00–02:00) as a workaround.
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
  const dayCode = DAY_CODES[at.getDay()];
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  const nowTime = `${hh}:${mm}`;

  const rules = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.outletId, outletId), eq(pricingRules.isActive, true)));

  const matching = rules
    .filter((r) => r.daysOfWeek.split(",").map((d) => d.trim()).includes(dayCode))
    .filter((r) => r.consoleType === "any" || r.consoleType === unit.consoleType)
    .filter((r) => nowTime >= r.startTime && nowTime <= r.endTime)
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
