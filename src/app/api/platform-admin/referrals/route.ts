import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { referralPartners, outlets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/** List every referral partner (= every outlet, auto-provisioned — see getOrCreateReferralPartner) for the platform-admin management table, joined with the outlet's own name for display. */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db
      .select({ partner: referralPartners, outletName: outlets.name })
      .from(referralPartners)
      .innerJoin(outlets, eq(referralPartners.outletId, outlets.id))
      .orderBy(desc(referralPartners.totalCommissionEarned));
    return NextResponse.json(rows.map((r) => ({ ...r.partner, outletName: r.outletName })));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
