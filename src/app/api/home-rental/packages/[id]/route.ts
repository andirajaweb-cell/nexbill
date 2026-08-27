import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalPackages, homeRentalPackageItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Edit package fields and/or fully replace its item list (if `items` is provided). Soft-delete via isActive: false — no hard delete, past rentals reference this package. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [existing] = await db.select().from(homeRentalPackages).where(eq(homeRentalPackages.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    const { id: _ignoreId, outletId: _ignoreOutlet, createdAt: _ignoreCreated, items, ...rest } = body;

    if (Array.isArray(items)) {
      await db.delete(homeRentalPackageItems).where(eq(homeRentalPackageItems.packageId, id));
      if (items.length > 0) {
        await db.insert(homeRentalPackageItems).values(items.map((i: any) => ({ packageId: id, productId: i.productId, quantity: Math.max(1, Number(i.quantity) || 1) })));
      }
    }
    const [row] = await db.update(homeRentalPackages).set(rest).where(eq(homeRentalPackages.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Paket tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
