import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { referralPartners, referralConversions, referralCommissions, referralPayouts, outlets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { TIER_DEFAULT_PERCENT, getNextPayoutDate, PAYOUT_CADENCE_LABEL } from "@/lib/referral/service";

/** Full detail view for one partner — referred outlets, commission ledger, payout history, and the outlet's saved bank info (for ops to actually send the payout to) — for the platform-admin drawer/detail panel. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [partner] = await db
      .select({
        partner: referralPartners,
        outletName: outlets.name,
        bankCountry: outlets.bankCountry,
        bankName: outlets.bankName,
        bankSwiftCode: outlets.bankSwiftCode,
        bankAccountNumber: outlets.bankAccountNumber,
        bankAccountHolderName: outlets.bankAccountHolderName,
      })
      .from(referralPartners)
      .innerJoin(outlets, eq(referralPartners.outletId, outlets.id))
      .where(eq(referralPartners.id, id))
      .limit(1);
    if (!partner) return NextResponse.json({ error: "Partner referral tidak ditemukan." }, { status: 404 });

    const conversions = await db
      .select({ conversion: referralConversions, refereeName: outlets.name })
      .from(referralConversions)
      .innerJoin(outlets, eq(referralConversions.refereeOutletId, outlets.id))
      .where(eq(referralConversions.referralPartnerId, id))
      .orderBy(desc(referralConversions.createdAt));
    const commissions = await db.select().from(referralCommissions).where(eq(referralCommissions.referralPartnerId, id)).orderBy(desc(referralCommissions.createdAt));
    const payouts = await db.select().from(referralPayouts).where(eq(referralPayouts.referralPartnerId, id)).orderBy(desc(referralPayouts.createdAt));

    return NextResponse.json({
      ...partner.partner,
      outletName: partner.outletName,
      bank: {
        bankCountry: partner.bankCountry,
        bankName: partner.bankName,
        bankSwiftCode: partner.bankSwiftCode,
        bankAccountNumber: partner.bankAccountNumber,
        bankAccountHolderName: partner.bankAccountHolderName,
      },
      referrals: conversions.map((c) => ({ ...c.conversion, refereeOutletName: c.refereeName })),
      commissions,
      payouts,
      payoutCadenceLabel: PAYOUT_CADENCE_LABEL,
      nextPayoutDate: getNextPayoutDate(),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

const EDITABLE_FIELDS = ["tier", "commissionPercent", "isActive", "notes"] as const;

/** Ops-only edit: change a partner's tier/rate/status/notes. Changing `tier` alone does NOT auto-change commissionPercent (see schema comment) — the UI is expected to pre-fill the tier's default rate as a suggestion, but ops can always override the actual number sent here. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    // Convenience: if the caller only sent a new tier with no explicit commissionPercent, apply that tier's default rate.
    if (body.tier !== undefined && body.commissionPercent === undefined && body.tier in TIER_DEFAULT_PERCENT) {
      patch.commissionPercent = TIER_DEFAULT_PERCENT[body.tier as keyof typeof TIER_DEFAULT_PERCENT];
    }
    patch.updatedAt = new Date().toISOString();
    const [updated] = await db.update(referralPartners).set(patch).where(eq(referralPartners.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Partner referral tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
