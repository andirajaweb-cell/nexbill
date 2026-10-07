import { db } from "@/db/client";
import { pricingRules, customers, membershipTiers, rentalUnits } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { pickPricingRule, ruleRateFor } from "./rate-rules";
import { isMembershipActive } from "@/lib/membership/tier-benefits";

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
 * Note: day/time matching uses outletHour()/outletDay() (src/lib/time/outlet-time.ts), NOT the
 * server's ambient clock — `at` is a real UTC instant, and plain `.getHours()`/`.getDay()` on it
 * would silently read back the SERVER's own timezone instead of the outlet's (WIB) whenever the
 * app happens to run on a host set to UTC, which is the default on most cloud hosts. That exact
 * bug is what made the dashboard's busy-hours charts show the wrong hour; the fix here is the
 * same one, applied to pricing rule matching (happy hour / jam malam / weekend rates) so a wrong
 * server timezone can't silently apply the wrong rate window too. Overnight windows that cross
 * midnight (e.g. 22:00–02:00) ARE supported — see ruleMatchesNow() in rate-rules.ts; a rule's daysOfWeek
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

  const rules = await db
    .select()
    .from(pricingRules)
    .where(and(eq(pricingRules.outletId, outletId), eq(pricingRules.isActive, true)));

  // Rule matching is pure (rate-rules.ts) so the offline cashier mode computes the
  // exact same rate on the device while the internet is down.
  const bestRule = pickPricingRule(unit, rules, at);
  const ruleRate = ruleRateFor(baseRate, bestRule);

  let memberTierName: string | null = null;
  let memberDiscountPercent = 0;
  if (customerId) {
    const [customer] = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
    if (customer?.membershipTierId) {
      const [tier] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, customer.membershipTierId)).limit(1);
      if (tier) {
        memberTierName = tier.name;
        /*
         * Diskon hanya berlaku selama keanggotaannya masih hidup. membershipExpiresAt null berarti
         * tanpa batas waktu — itu kasus tier yang didapat lewat total belanja, dan tier berbayar
         * yang masa berlakunya memang disetel seumur hidup — jadi keduanya lolos apa adanya dan
         * perilaku lama tidak berubah sedikit pun untuk data yang sudah ada.
         *
         * Namanya tetap dikembalikan meski sudah kedaluwarsa, supaya kasir melihat "Gold" di layar
         * dengan tarif penuh dan langsung tahu ada perpanjangan yang bisa ditawarkan — bukan
         * diam-diam kehilangan status member tanpa penjelasan.
         */
        memberDiscountPercent = isMembershipActive(customer.membershipExpiresAt, at) ? tier.discountPercent : 0;
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

// Pure charge arithmetic lives in ./charge (no DB imports, safe for client components).
// Re-exported here so every existing server-side importer of "@/lib/rental/pricing" keeps working.
export { roundUpMinutes, computeSessionCharge } from "./charge";
export type { SessionChargeInput, SessionCharge } from "./charge";
