import { NextRequest, NextResponse } from "next/server";
import { computeExpenseDashboard } from "@/lib/reports/expense";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await computeExpenseDashboard(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
