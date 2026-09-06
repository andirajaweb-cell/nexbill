import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { promos, promoBundleItems, products, orders, rentalSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

async function getBundleItems(promoId: string) {
  return db
    .select({ id: promoBundleItems.id, promoId: promoBundleItems.promoId, productId: promoBundleItems.productId, qty: promoBundleItems.qty, productName: products.name, price: products.price })
    .from(promoBundleItems)
    .innerJoin(products, eq(products.id, promoBundleItems.productId))
    .where(eq(promoBundleItems.promoId, promoId));
}

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
    // bundleItems is handled separately below (own table) — never let it fall through to
    // promos.set(), which has no such column.
    const { bundleItems, ...rest } = body;
    const [row] = await db.update(promos).set({ ...rest, updatedAt: new Date().toISOString() }).where(eq(promos.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });

    // Only touches bundle items when the client actually sent the field — omitting it (e.g. a
    // PATCH that only flips isActive) leaves the existing bundle untouched instead of wiping it.
    if (Array.isArray(bundleItems)) {
      await db.delete(promoBundleItems).where(eq(promoBundleItems.promoId, id));
      const validItems: { productId: string; qty: number }[] = bundleItems
        .filter((i: any) => i?.productId && Number(i.qty) > 0)
        .map((i: any) => ({ productId: i.productId, qty: Math.floor(Number(i.qty)) }));
      if (validItems.length) {
        await db.insert(promoBundleItems).values(validItems.map((i) => ({ promoId: id, productId: i.productId, qty: i.qty })));
      }
    }

    return NextResponse.json({ ...row, bundleItems: await getBundleItems(id) });
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

    // No FK cascade on promoBundleItems.promoId — clear its rows first or a hard-deleted promo
    // would leave them orphaned, pointing at nothing.
    await db.delete(promoBundleItems).where(eq(promoBundleItems.promoId, id));
    const [row] = await db.delete(promos).where(eq(promos.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, softDeleted: false, row });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
