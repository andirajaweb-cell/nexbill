import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasConflict } from "@/lib/rental/bookings";
import { describeError } from "@/lib/api/error";

/**
 * Public, unauthenticated "will this slot work?" check for /book — lets the
 * booking form give a live Tersedia/Bentrok verdict as the customer picks a
 * unit/console type + date/time/duration, before they submit. Reuses the
 * exact same hasConflict() the real booking engine uses (including the
 * buffer-minutes and floating-booking capacity logic), so the preview never
 * disagrees with what createBooking() actually decides on submit — the only
 * possible drift is a race if someone else books the same slot in between.
 *
 * A "conflict" here is informational only, not a hard block: submitting
 * anyway just puts the booking on the waiting list (see createBooking()),
 * so this endpoint never needs to reject anything itself.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { outletId, rentalUnitId, consoleType, scheduledStart, scheduledEnd } = body;
    if (!outletId || !scheduledStart || !scheduledEnd) {
      return NextResponse.json({ error: "outletId, scheduledStart, scheduledEnd wajib diisi." }, { status: 400 });
    }
    if (!rentalUnitId && !consoleType) {
      return NextResponse.json({ error: "Pilih unit atau tipe konsol." }, { status: 400 });
    }

    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (!outlet) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    const conflict = await hasConflict(outletId, { rentalUnitId: rentalUnitId || null, consoleType: consoleType || null }, scheduledStart, scheduledEnd, outlet.bookingBufferMinutes);
    return NextResponse.json({ available: !conflict });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
