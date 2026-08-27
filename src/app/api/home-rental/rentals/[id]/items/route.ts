import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalRentalItems, homeRentalRentals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Itemized packing list (perlengkapan/rincian barang) for a rental — e.g. "Kabel HDMI x1", "Charger x1", "Controller ekstra x2". */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, id)).limit(1);
    if (!rental || rental.outletId !== session.outletId) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });
    const rows = await db.select().from(homeRentalRentalItems).where(eq(homeRentalRentalItems.rentalId, id));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, id)).limit(1);
    if (!rental || rental.outletId !== session.outletId) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    if (!body.name?.trim()) return NextResponse.json({ error: "Nama barang wajib diisi." }, { status: 400 });
    const [row] = await db
      .insert(homeRentalRentalItems)
      .values({ rentalId: id, name: body.name.trim(), quantity: Math.max(1, Number(body.quantity) || 1), note: body.note ?? null })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
