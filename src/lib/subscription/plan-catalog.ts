import { db } from "@/db/client";
import { subscriptionPlans, subscriptions, rentalUnits } from "@/db/schema";
import { and, eq, inArray, asc } from "drizzle-orm";
import { computePlanCharge, planTierOf, normalizeCycle, minUnitsOf, DEFAULT_PRICING, type BillingCycle, type PlanCharge } from "./pricing";

/**
 * Akses DB untuk katalog paket Starter/Pro (lihat pricing.ts untuk aturannya). Sengaja tidak
 * mengimpor service.ts supaya bisa dipakai billing-group.ts dan service.ts tanpa import melingkar.
 */

export type PlanRow = typeof subscriptionPlans.$inferSelect;
type SubRow = typeof subscriptions.$inferSelect;

const PLAN_SEEDS = [
  {
    code: "starter",
    name: "NEXBILL Starter",
    tier: "starter" as const,
    pricingModel: "per_unit" as const,
    priceOriginal: DEFAULT_PRICING.starterPerUnit,
    priceCurrent: DEFAULT_PRICING.starterPerUnit,
    minUnits: DEFAULT_PRICING.starterMinUnits,
    multiOutletDiscountPct: 0,
    unlimitedEntitlement: false,
    sortOrder: 1,
  },
  {
    code: "pro",
    name: "NEXBILL Pro",
    tier: "pro" as const,
    pricingModel: "flat" as const,
    priceOriginal: DEFAULT_PRICING.proFlat,
    priceCurrent: DEFAULT_PRICING.proFlat,
    minUnits: 1,
    multiOutletDiscountPct: DEFAULT_PRICING.multiOutletDiscountPct,
    unlimitedEntitlement: true,
    sortOrder: 2,
  },
];

/** Memastikan paket "starter" dan "pro" ada (idempoten, per kode). Mengembalikan katalog aktif urut sortOrder. */
export async function ensureDefaultPlans(): Promise<PlanRow[]> {
  const existing = await db.select().from(subscriptionPlans).where(inArray(subscriptionPlans.code, PLAN_SEEDS.map((p) => p.code)));
  const have = new Set(existing.map((p) => p.code));
  const missing = PLAN_SEEDS.filter((p) => !have.has(p.code));
  if (missing.length) {
    await db
      .insert(subscriptionPlans)
      .values(
        missing.map((p) => ({
          ...p,
          includedConsoles: 0,
          extraConsolePrice: 0,
          annualMonthsCharged: DEFAULT_PRICING.annualMonthsCharged,
          aiAddonPriceMonthly: DEFAULT_PRICING.aiAddonMonthly,
          isActive: true,
        }))
      )
      .onConflictDoNothing({ target: subscriptionPlans.code });
  }
  return listCatalogPlans();
}

export async function listCatalogPlans(): Promise<PlanRow[]> {
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true)).orderBy(asc(subscriptionPlans.sortOrder));
}

export async function getPlanById(id: string | null | undefined): Promise<PlanRow | null> {
  if (!id) return null;
  const [p] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return p ?? null;
}

export async function getPlanByCode(code: string): Promise<PlanRow | null> {
  const [p] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.code, code)).limit(1);
  return p ?? null;
}

/** Jumlah unit PS aktif di outlet — dasar tagihan Starter & batas kuota. */
export async function countActiveUnits(outletId: string, excludeUnitId?: string): Promise<number> {
  const rows = await db
    .select({ id: rentalUnits.id })
    .from(rentalUnits)
    .where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
  return rows.filter((r) => r.id !== excludeUnitId).length;
}

/**
 * True kalau outlet ini BUKAN outlet Pro pertama di grup penagihannya — ada anggota lain yang
 * paketnya Pro, statusnya berbayar (active/grace), dan dibuat lebih dulu → dapat diskon multi-cabang.
 */
export async function isAdditionalProOutlet(sub: Pick<SubRow, "id" | "billingGroupId" | "createdAt">): Promise<boolean> {
  if (!sub.billingGroupId) return false;
  const members = await db
    .select({ id: subscriptions.id, status: subscriptions.status, planId: subscriptions.planId, createdAt: subscriptions.createdAt })
    .from(subscriptions)
    .where(eq(subscriptions.billingGroupId, sub.billingGroupId));
  const candidates = members.filter((m) => m.id !== sub.id && (m.status === "active" || m.status === "grace") && m.planId && m.createdAt < sub.createdAt);
  if (!candidates.length) return false;
  const plans = await db.select().from(subscriptionPlans).where(inArray(subscriptionPlans.id, candidates.map((c) => c.planId as string)));
  return plans.some((p) => planTierOf(p) === "pro");
}

/** Paket/siklus/kuota yang akan dipakai di perpanjangan berikutnya (next* kalau diisi, else yang berjalan). */
export function desiredSelection(sub: SubRow): { planId: string | null; cycle: BillingCycle; units: number } {
  return {
    planId: sub.nextPlanId ?? sub.planId,
    cycle: normalizeCycle(sub.nextBillingCycle ?? sub.billingCycle),
    units: sub.nextPlanUnits ?? sub.planUnits ?? 0,
  };
}

/** Tagihan satu siklus untuk langganan + paket tertentu, memperhitungkan unit aktif & diskon cabang. */
export async function chargeFor(sub: SubRow, plan: PlanRow, opts: { cycle: BillingCycle; units: number }): Promise<PlanCharge> {
  const active = planTierOf(plan) === "starter" ? await countActiveUnits(sub.outletId) : 0;
  const units = Math.max(opts.units || 0, active, minUnitsOf(plan));
  const additionalOutlet = planTierOf(plan) === "pro" ? await isAdditionalProOutlet(sub) : false;
  return computePlanCharge(plan, { units, cycle: opts.cycle, additionalOutlet });
}
