import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { checkoutHomeRentalRental } from "@/lib/home-rental/rentals";
import { db } from "@/db/client";
import { homeRentalRentals } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Allocates physical assets, collects payment + deposit, posts accounting, marks the rental ACTIVE. Body: { assetIds?, paymentMethod, depositPaymentMethod?, rentalFeeOverride?, discountAmountOverride?, depositAmountOverride? }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [existingRental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, id)).limit(1);
    if (!existingRental || existingRental.outletId !== session.outletId) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    if (!body.paymentMethod) return NextResponse.json({ error: "Metode pembayaran wajib diisi." }, { status: 400 });
    const row = await checkoutHomeRentalRental(id, { ...body, staffUserId: session.sub });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
