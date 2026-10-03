import { NextResponse } from "next/server";
import { ensureDefaultPlans } from "@/lib/subscription/plan-catalog";
import { planTierOf, minUnitsOf, monthsChargedFor } from "@/lib/subscription/pricing";
import { describeError } from "@/lib/api/error";

/**
 * Public (unauthenticated) — feeds the /daftar registration wizard's live price preview (paket
 * Starter per unit vs Pro flat) as the owner types in their TV composition, BEFORE they have an
 * account/session to call the normal (auth-gated) /api/subscription route. Only exposes the
 * handful of numbers needed for that math — never plan internals beyond price.
 */
export async function GET() {
  try {
    const plans = await ensureDefaultPlans();
    const starter = plans.find((p) => planTierOf(p) === "starter");
    const pro = plans.find((p) => planTierOf(p) === "pro");
    return NextResponse.json({
      starter: starter ? { name: starter.name, pricePerUnit: starter.priceCurrent, minUnits: minUnitsOf(starter) } : null,
      pro: pro ? { name: pro.name, priceFlat: pro.priceCurrent, multiOutletDiscountPct: pro.multiOutletDiscountPct } : null,
      annualMonthsCharged: monthsChargedFor(pro ?? starter ?? { priceCurrent: 0 }, "annual"),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
