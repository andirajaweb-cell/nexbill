import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { subscriptionPlans } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const plans = await db.select().from(subscriptionPlans);
    return NextResponse.json(plans.sort((a, b) => a.sortOrder - b.sortOrder));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json();
    if (!body.code || !body.name) return NextResponse.json({ error: "code dan name wajib diisi." }, { status: 400 });
    const [row] = await db
      .insert(subscriptionPlans)
      .values({
        code: body.code,
        name: body.name,
        priceOriginal: Number(body.priceOriginal ?? 0),
        priceCurrent: Number(body.priceCurrent ?? 0),
        includedConsoles: Number(body.includedConsoles ?? 0),
        extraConsolePrice: Number(body.extraConsolePrice ?? 0),
        tier: body.tier === "starter" ? "starter" : "pro",
        pricingModel: body.pricingModel === "per_unit" ? "per_unit" : "flat",
        minUnits: Math.max(1, Number(body.minUnits ?? 1) || 1),
        annualMonthsCharged: Math.min(12, Math.max(1, Number(body.annualMonthsCharged ?? 10) || 10)),
        multiOutletDiscountPct: Math.min(90, Math.max(0, Number(body.multiOutletDiscountPct ?? 0) || 0)),
        smartPlugPrice: Number(body.smartPlugPrice ?? 275000),
        setupServicePrice: Number(body.setupServicePrice ?? 125000),
        unlimitedEntitlement: Boolean(body.unlimitedEntitlement ?? false),
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder ?? 0),
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
