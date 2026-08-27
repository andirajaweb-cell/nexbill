import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Edit a product, or soft-delete it (isActive: false) — no hard delete, since physical assets may still reference it (history must stay intact). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [existing] = await db.select().from(homeRentalProducts).where(eq(homeRentalProducts.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    const { id: _ignoreId, outletId: _ignoreOutlet, createdAt: _ignoreCreated, ...rest } = body;
    const [row] = await db.update(homeRentalProducts).set(rest).where(eq(homeRentalProducts.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
