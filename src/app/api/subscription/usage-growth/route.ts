import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMonthlyUsageStats } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";

/** "Pertumbuhan Data" tab — monthly transaction-count + revenue trend for this outlet. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const months = await getMonthlyUsageStats(session.outletId, 6);
    return NextResponse.json({ months });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
