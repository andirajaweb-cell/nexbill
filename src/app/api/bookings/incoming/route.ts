import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { bookings, rentalUnits } from "@/db/schema";
import { and, eq, gt, inArray, notInArray, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Booking dari pelanggan (online / WhatsApp) yang dibuat setelah `since` — dipanggil berkala oleh
 * pop-up "Booking Baru" di layout dashboard supaya kasir langsung tahu ada booking masuk. Booking
 * yang diinput kasir sendiri tidak ikut (kasirnya sudah tahu). Tanpa `since` hanya mengembalikan
 * `serverNow` sebagai titik awal, supaya pop-up tidak memunculkan booking lama saat pertama dibuka.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_bookings")) return NextResponse.json({ serverNow: new Date().toISOString(), items: [] });
    const serverNow = new Date().toISOString();
    const since = req.nextUrl.searchParams.get("since");
    if (!since || Number.isNaN(Date.parse(since))) return NextResponse.json({ serverNow, items: [] });

    const rows = await db
      .select({
        id: bookings.id,
        bookingCode: bookings.bookingCode,
        customerName: bookings.customerName,
        phone: bookings.phone,
        rentalUnitId: bookings.rentalUnitId,
        consoleType: bookings.consoleType,
        scheduledStart: bookings.scheduledStart,
        scheduledEnd: bookings.scheduledEnd,
        status: bookings.status,
        source: bookings.source,
        dpAmount: bookings.dpAmount,
        dpPaid: bookings.dpPaid,
        notes: bookings.notes,
        waitlistPosition: bookings.waitlistPosition,
        createdAt: bookings.createdAt,
        unitName: rentalUnits.name,
      })
      .from(bookings)
      .leftJoin(rentalUnits, eq(rentalUnits.id, bookings.rentalUnitId))
      .where(
        and(
          eq(bookings.outletId, session.outletId),
          inArray(bookings.source, ["online", "whatsapp"]),
          notInArray(bookings.status, ["cancelled", "expired"]),
          gt(bookings.createdAt, new Date(since).toISOString())
        )
      )
      .orderBy(asc(bookings.createdAt))
      .limit(20);
    return NextResponse.json({ serverNow, items: rows });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
