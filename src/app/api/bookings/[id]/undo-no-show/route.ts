import { NextRequest, NextResponse } from "next/server";
import { undoNoShow } from "@/lib/rental/bookings";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { bookings } from "@/db/schema";
import { eq } from "drizzle-orm";

const ADMIN_ROLES = ["superuser", "owner"];

/** Undoing a no-show is a correction, not routine booking management — deliberately
 * restricted to Superuser/Owner (unlike marking no-show itself, which any staff with
 * manage_bookings can do), so a cashier can't quietly reverse their own no-show call. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!ADMIN_ROLES.includes(session.role as string)) {
      return NextResponse.json({ error: "Hanya Superuser/Owner yang bisa membatalkan status no-show." }, { status: 403 });
    }
    const [existingBooking] = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    if (!existingBooking || existingBooking.outletId !== session.outletId) return NextResponse.json({ error: "Booking tidak ditemukan." }, { status: 404 });
    return NextResponse.json(await undoNoShow(id, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
