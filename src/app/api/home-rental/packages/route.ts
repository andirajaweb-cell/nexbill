import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalPackages, homeRentalPackageItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const packages = await db.select().from(homeRentalPackages).where(eq(homeRentalPackages.outletId, session.outletId));
    const items = packages.length ? await db.select().from(homeRentalPackageItems) : [];
    const withItems = packages.map((p) => ({ ...p, items: items.filter((i) => i.packageId === p.id) }));
    return NextResponse.json(withItems);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Body: { name, dailyRate, ..., items: [{ productId, quantity }] }. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name) return NextResponse.json({ error: "Nama paket wajib diisi." }, { status: 400 });
    const items: { productId: string; quantity?: number }[] = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) return NextResponse.json({ error: "Paket harus punya minimal 1 produk." }, { status: 400 });

    const [pkg] = await db
      .insert(homeRentalPackages)
      .values({
        outletId: session.outletId,
        name: body.name,
        dailyRate: Number(body.dailyRate) || 0,
        weekendRate: body.weekendRate != null ? Number(body.weekendRate) : null,
        overnightRate: body.overnightRate != null ? Number(body.overnightRate) : null,
        weeklyRate: body.weeklyRate != null ? Number(body.weeklyRate) : null,
        extraDayRate: body.extraDayRate != null ? Number(body.extraDayRate) : null,
        deliveryFee: Number(body.deliveryFee) || 0,
        pickupFee: Number(body.pickupFee) || 0,
        defaultDepositAmount: Number(body.defaultDepositAmount) || 0,
        description: body.description ?? null,
      })
      .returning();

    await db.insert(homeRentalPackageItems).values(items.map((i) => ({ packageId: pkg.id, productId: i.productId, quantity: Math.max(1, Number(i.quantity) || 1) })));
    return NextResponse.json(pkg);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
