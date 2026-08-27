import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalRentalItems, homeRentalRentals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

async function assertOwnedRentalItem(itemId: string, outletId: string) {
  const [item] = await db.select().from(homeRentalRentalItems).where(eq(homeRentalRentalItems.id, itemId)).limit(1);
  if (!item) return null;
  const [rental] = await db.select({ outletId: homeRentalRentals.outletId }).from(homeRentalRentals).where(eq(homeRentalRentals.id, item.rentalId)).limit(1);
  if (!rental || rental.outletId !== outletId) return null;
  return item;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    if (!(await assertOwnedRentalItem(itemId, session.outletId))) return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    const { id: _ignoreId, rentalId: _ignoreRentalId, createdAt: _ignoreCreated, ...rest } = body;
    const [row] = await db.update(homeRentalRentalItems).set(rest).where(eq(homeRentalRentalItems.id, itemId)).returning();
    if (!row) return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { itemId } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    if (!(await assertOwnedRentalItem(itemId, session.outletId))) return NextResponse.json({ error: "Barang tidak ditemukan." }, { status: 404 });
    await db.delete(homeRentalRentalItems).where(eq(homeRentalRentalItems.id, itemId));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
