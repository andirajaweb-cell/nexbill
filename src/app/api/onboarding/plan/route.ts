import { NextResponse } from "next/server";
import { ensureDefaultPlan } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";

/**
 * Public (unauthenticated) — feeds the /daftar registration wizard's live "berapa smart plug /
 * konsol tambahan yang kamu butuhkan" preview as the owner types in their TV composition,
 * BEFORE they have an account/session to call the normal (auth-gated) /api/subscription route.
 * Only exposes the handful of numbers needed for that math — never plan internals beyond price.
 */
export async function GET() {
  try {
    const plan = await ensureDefaultPlan();
    return NextResponse.json({
      name: plan.name,
      priceOriginal: plan.priceOriginal,
      priceCurrent: plan.priceCurrent,
      includedConsoles: plan.includedConsoles,
      extraConsolePrice: plan.extraConsolePrice,
      smartPlugPrice: plan.smartPlugPrice,
      setupServicePrice: plan.setupServicePrice,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
