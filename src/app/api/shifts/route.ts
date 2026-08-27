import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { shifts, staffUsers } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { openShift } from "@/lib/shift/shift";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId here.
    const outletId = session.outletId;
    // Left-joined so the shift history table can show who's responsible for each
    // shift (and its cash/non-cash variance) without a second round-trip per row.
    const rows = await db
      .select({
        id: shifts.id,
        outletId: shifts.outletId,
        staffUserId: shifts.staffUserId,
        staffName: staffUsers.name,
        openedAt: shifts.openedAt,
        closedAt: shifts.closedAt,
        openingCash: shifts.openingCash,
        expectedCash: shifts.expectedCash,
        actualCash: shifts.actualCash,
        variance: shifts.variance,
        nonCashVarianceTotal: shifts.nonCashVarianceTotal,
        status: shifts.status,
        notes: shifts.notes,
      })
      .from(shifts)
      .leftJoin(staffUsers, eq(shifts.staffUserId, staffUsers.id))
      .where(eq(shifts.outletId, outletId))
      .orderBy(desc(shifts.openedAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { openingCash } = await req.json();
    // outletId & staffUserId always come from the session — never trust a client-supplied
    // value here, this is a real shift-open write.
    return NextResponse.json(await openShift(session.outletId, session.sub, openingCash));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
