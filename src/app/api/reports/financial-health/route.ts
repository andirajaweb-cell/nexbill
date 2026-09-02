import { NextRequest, NextResponse } from "next/server";
import { computeFinancialHealth } from "@/lib/reports/financial-health";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

/** Defaults to the current calendar month when no range is given — every ratio here (especially
 * unit utilization) needs a bounded period to mean anything, unlike the other Reports tabs which
 * tolerate an open-ended "all time" range. */
function defaultMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = now.toISOString().slice(0, 10);
  return { from, to };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;
    const defaults = defaultMonthRange();
    const from = req.nextUrl.searchParams.get("from") || defaults.from;
    const to = req.nextUrl.searchParams.get("to") || defaults.to;
    return NextResponse.json(await computeFinancialHealth(outletId, from, to));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
