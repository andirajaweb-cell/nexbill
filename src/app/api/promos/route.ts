import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { promos, promoBundleItems, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Attaches each promo's bundled F&B items (if any — see promoBundleItems' schema doc comment), with the product's current name/price joined in for display, since the bundle-editing UI needs both without a second round trip per promo. */
async function withBundleItems(rows: (typeof promos.$inferSelect)[]) {
  if (!rows.length) return rows.map((r) => ({ ...r, bundleItems: [] as { id: string; productId: string; productName: string; price: number; qty: number }[] }));
  const promoIds = rows.map((r) => r.id);
  const items = await db
    .select({ id: promoBundleItems.id, promoId: promoBundleItems.promoId, productId: promoBundleItems.productId, qty: promoBundleItems.qty, productName: products.name, price: products.price })
    .from(promoBundleItems)
    .innerJoin(products, eq(products.id, promoBundleItems.productId))
    .where(inArray(promoBundleItems.promoId, promoIds));
  const byPromo = new Map<string, typeof items>();
  for (const item of items) {
    if (!byPromo.has(item.promoId)) byPromo.set(item.promoId, []);
    byPromo.get(item.promoId)!.push(item);
  }
  return rows.map((r) => ({ ...r, bundleItems: byPromo.get(r.id) ?? [] }));
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(promos).where(eq(promos.outletId, session.outletId));
    return NextResponse.json(await withBundleItems(rows));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuat promo." }, { status: 403 });
    }

    const body = await req.json();
    // bundleItems (F&B included free with a rental_package promo — "sewa konsol + makanan/minuman")
    // lives in its own table, not a promos column, so it's pulled out here before the insert.
    const { outletId: _ignoredOutlet, bundleItems, ...rest } = body;
    const [row] = await db.insert(promos).values({ ...rest, outletId: session.outletId }).returning();

    const validItems: { productId: string; qty: number }[] = Array.isArray(bundleItems)
      ? bundleItems.filter((i: any) => i?.productId && Number(i.qty) > 0).map((i: any) => ({ productId: i.productId, qty: Math.floor(Number(i.qty)) }))
      : [];
    if (validItems.length) {
      await db.insert(promoBundleItems).values(validItems.map((i) => ({ promoId: row.id, productId: i.productId, qty: i.qty })));
    }

    const [withItems] = await withBundleItems([row]);
    return NextResponse.json(withItems);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
