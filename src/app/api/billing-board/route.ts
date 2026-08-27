import { NextRequest, NextResponse } from "next/server";
import { getLiveBillingBoard } from "@/lib/rental/board";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await getLiveBillingBoard(session.outletId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
