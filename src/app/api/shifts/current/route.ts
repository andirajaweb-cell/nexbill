import { NextRequest, NextResponse } from "next/server";
import { getCurrentShift } from "@/lib/shift/shift";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet + own staff account — never trust client-supplied
    // outletId/staffUserId query params here.
    return NextResponse.json(await getCurrentShift(session.outletId, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
