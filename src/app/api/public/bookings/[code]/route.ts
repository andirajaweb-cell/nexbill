import { NextRequest, NextResponse } from "next/server";
import { getBookingByCode } from "@/lib/rental/bookings";
import { db } from "@/db/client";
import { rentalUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { describeError } from "@/lib/api/error";

/**
 * Public "Cek Status Booking" lookup — code + outletId only, no auth. Does
 * NOT return the full row (avoids leaking customerId/internal notes/audit
 * fields to an anonymous caller who only proved they know the booking code,
 * not that they own it) — just what a customer needs to see their status.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const outletId = req.nextUrl.searchParams.get("outletId");
    if (!outletId) return NextResponse.json({ error: "outletId wajib diisi." }, { status: 400 });

    const booking = await getBookingByCode(outletId, code.toUpperCase());
    if (!booking) return NextResponse.json({ error: "Booking tidak ditemukan — cek kembali kode booking kamu." }, { status: 404 });

    let unitName: string | null = null;
    if (booking.rentalUnitId) {
      const [unit] = await db.select({ name: rentalUnits.name }).from(rentalUnits).where(eq(rentalUnits.id, booking.rentalUnitId)).limit(1);
      unitName = unit?.name ?? null;
    }

    return NextResponse.json({
      bookingCode: booking.bookingCode,
      status: booking.status,
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      consoleType: booking.consoleType,
      unitName,
      waitlistPosition: booking.waitlistPosition,
      customerName: booking.customerName,
      cancelReason: booking.cancelReason,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
