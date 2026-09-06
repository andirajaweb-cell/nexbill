import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { shifts, staffUsers, approvalRequests } from "@/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
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
        riskFlags: shifts.riskFlags,
      })
      .from(shifts)
      .leftJoin(staffUsers, eq(shifts.staffUserId, staffUsers.id))
      .where(eq(shifts.outletId, outletId))
      .orderBy(desc(shifts.openedAt));

    // Anti-fraud review status (see lib/shift/fraud-detection.ts) — a flagged shift gets a
    // shift_close_review approval_requests row; surface its status alongside riskFlags so the
    // history table can show "Menunggu Review" vs "Sudah Ditinjau" without a second round-trip.
    const flaggedIds = rows.filter((r) => r.riskFlags && r.riskFlags !== "[]").map((r) => r.id);
    const reviewByShiftId = new Map<string, { id: string; status: string }>();
    if (flaggedIds.length > 0) {
      const reviews = await db
        .select({ id: approvalRequests.id, refId: approvalRequests.refId, status: approvalRequests.status })
        .from(approvalRequests)
        .where(and(eq(approvalRequests.type, "shift_close_review"), inArray(approvalRequests.refId, flaggedIds)));
      for (const r of reviews) reviewByShiftId.set(r.refId, { id: r.id, status: r.status });
    }

    return NextResponse.json(rows.map((r) => ({ ...r, review: reviewByShiftId.get(r.id) ?? null })));
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
