import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(homeRentalProducts).where(eq(homeRentalProducts.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nama produk wajib diisi." }, { status: 400 });
    if (!body.type) return NextResponse.json({ error: "Tipe produk wajib diisi." }, { status: 400 });
    const [row] = await db
      .insert(homeRentalProducts)
      .values({
        outletId: session.outletId,
        name: body.name,
        type: body.type,
        dailyRate: Number(body.dailyRate) || 0,
        weekendRate: body.weekendRate != null ? Number(body.weekendRate) : null,
        overnightRate: body.overnightRate != null ? Number(body.overnightRate) : null,
        weeklyRate: body.weeklyRate != null ? Number(body.weeklyRate) : null,
        extraDayRate: body.extraDayRate != null ? Number(body.extraDayRate) : null,
        deliveryFee: Number(body.deliveryFee) || 0,
        pickupFee: Number(body.pickupFee) || 0,
        defaultDepositAmount: Number(body.defaultDepositAmount) || 0,
        description: body.description ?? null,
        imageUrl: body.imageUrl ?? null,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
