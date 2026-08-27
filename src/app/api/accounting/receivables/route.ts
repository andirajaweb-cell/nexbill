import { NextRequest, NextResponse } from "next/server";
import { computeAccountsReceivable } from "@/lib/accounting/ar-ap";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await computeAccountsReceivable(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
