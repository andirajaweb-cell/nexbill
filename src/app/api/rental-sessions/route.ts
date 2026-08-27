import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { rentalSessions } from "@/db/schema";
import { startRentalSession } from "@/lib/rental/sessions";
import { getSession } from "@/lib/auth/session";
import { describeError, errorStatus } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(rentalSessions).where(eq(rentalSessions.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Start a rental session: locks in the pricing-engine rate, marks the unit occupied, switches its TV/console power on. */
export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Never trust a client-supplied outletId — startRentalSession derives the outlet from the
    // rental unit itself, so pin expectedOutletId to the caller's session and let it 404 the
    // unit if that unit doesn't actually belong to them (prevents starting a session against
    // another tenant's rental unit).
    const { session: started, rate, bill, prepayment } = await startRentalSession({ ...body, expectedOutletId: session.outletId });
    return NextResponse.json({ ...started, rateBreakdown: rate, bill, prepayment });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
