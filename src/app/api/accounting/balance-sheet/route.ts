import { NextRequest, NextResponse } from "next/server";
import { computeBalanceSheet } from "@/lib/accounting/reports";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const asOf = req.nextUrl.searchParams.get("asOf") ?? undefined;
    const result = await computeBalanceSheet(session.outletId, asOf);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
