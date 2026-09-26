import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets, shifts, staffUsers } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { getExpectedOpeningCash } from "@/lib/shift/shift";

/**
 * For the "Buka Shift" form: what the previous shift left in the drawer (to count against) and
 * whether another shift is still open at this outlet (single-drawer rule, see openShift).
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const expected = await getExpectedOpeningCash(session.outletId);
    const [outlet] = await db.select({ allowMultipleOpenShifts: outlets.allowMultipleOpenShifts }).from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
    const openShifts = await db
      .select({ id: shifts.id, staffUserId: shifts.staffUserId, openedAt: shifts.openedAt, staffName: staffUsers.name })
      .from(shifts)
      .leftJoin(staffUsers, eq(shifts.staffUserId, staffUsers.id))
      .where(and(eq(shifts.outletId, session.outletId), eq(shifts.status, "open")));
    return NextResponse.json({
      expectedOpeningCash: expected?.amount ?? null,
      allowMultipleOpenShifts: !!outlet?.allowMultipleOpenShifts,
      otherOpenShifts: openShifts.filter((s) => s.staffUserId !== session.sub),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
