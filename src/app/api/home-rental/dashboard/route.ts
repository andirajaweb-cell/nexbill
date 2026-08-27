import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { getHomeRentalDashboardSummary } from "@/lib/home-rental/rentals";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const summary = await getHomeRentalDashboardSummary(session.outletId);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
