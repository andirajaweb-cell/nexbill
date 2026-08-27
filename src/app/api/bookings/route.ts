import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { bookings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { createBooking } from "@/lib/rental/bookings";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always scoped to the caller's own outlet — never trust a client-supplied outletId here.
    const rows = await db.select().from(bookings).where(eq(bookings.outletId, session.outletId)).orderBy(desc(bookings.scheduledStart));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_bookings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuat booking." }, { status: 403 });
    }
    const body = await req.json();
    const result = await createBooking({ ...body, staffUserId: session.sub });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
