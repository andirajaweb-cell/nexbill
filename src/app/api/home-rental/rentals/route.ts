import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalRentals } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { createHomeRentalBooking } from "@/lib/home-rental/rentals";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;
    const status = req.nextUrl.searchParams.get("status");
    const rows = await db
      .select()
      .from(homeRentalRentals)
      .where(status ? and(eq(homeRentalRentals.outletId, outletId), eq(homeRentalRentals.status, status as any)) : eq(homeRentalRentals.outletId, outletId))
      .orderBy(desc(homeRentalRentals.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Create a new Home Rental booking (reservation only — no payment/asset allocation yet, see checkout). */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const body = await req.json();
    const row = await createHomeRentalBooking({ ...body, outletId: session.outletId, staffUserId: session.sub });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
