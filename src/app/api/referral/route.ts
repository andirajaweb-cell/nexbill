import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getReferralDashboard } from "@/lib/referral/service";
import { describeError } from "@/lib/api/error";

/** Everything the outlet's own /dashboard/referral page needs: code/link, tier + rate, referred outlets, commission ledger, payout history. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const data = await getReferralDashboard(session.outletId);
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
