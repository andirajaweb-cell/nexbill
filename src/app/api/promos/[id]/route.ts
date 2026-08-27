import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { promos, orders, rentalSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah promo." }, { status: 403 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(promos).where(eq(promos.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    delete body.outletId;
    const [row] = await db.update(promos).set({ ...body, updatedAt: new Date().toISOString() }).where(eq(promos.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Hard-deletes if the promo was never used by any order/rental session; otherwise soft-deletes (isActive false) so historical transactions referencing it don't dangle — same convention as the generic admin panel's softDeleteColumn handling. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus promo." }, { status: 403 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(promos).where(eq(promos.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });

    const [usedInOrder] = await db.select({ id: orders.id }).from(orders).where(eq(orders.promoId, id)).limit(1);
    const [usedInSession] = await db.select({ id: rentalSessions.id }).from(rentalSessions).where(eq(rentalSessions.promoId, id)).limit(1);

    if (usedInOrder || usedInSession) {
      const [row] = await db.update(promos).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(promos.id, id)).returning();
      if (!row) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ ok: true, softDeleted: true, row });
    }

    const [row] = await db.delete(promos).where(eq(promos.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, softDeleted: false, row });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
