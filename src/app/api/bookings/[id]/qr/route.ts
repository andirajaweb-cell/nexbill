import { NextResponse } from "next/server";
import qrcode from "qrcode";
import { bookings } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

/** Returns a data-URL QR code encoding this booking's code — customer shows it (or the kasir scans/types it) for fast check-in via /api/bookings/lookup/[code]. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { row: booking } = await requireOwnedRow<typeof bookings.$inferSelect>(bookings, id, "Booking tidak ditemukan.");
    if (!booking.bookingCode) return NextResponse.json({ error: "Booking ini belum punya kode." }, { status: 400 });

    const qrDataUrl = await qrcode.toDataURL(booking.bookingCode);
    return NextResponse.json({ bookingCode: booking.bookingCode, qrDataUrl });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
