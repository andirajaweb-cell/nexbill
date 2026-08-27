import { NextRequest, NextResponse } from "next/server";
import { checkInBooking } from "@/lib/rental/bookings";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_bookings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melakukan check-in." }, { status: 403 });
    }
    const [existingBooking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!existingBooking || existingBooking.outletId !== session.outletId) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    return NextResponse.json(await checkInBooking(id, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
