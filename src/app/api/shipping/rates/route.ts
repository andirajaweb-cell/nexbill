import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { db } from "@/db/client";
import { platformProducts } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { getRates } from "@/lib/shipping/biteship";
import { describeError } from "@/lib/api/error";

/**
 * Prices shipping for whatever Smart Plug items are currently in the merchant's cart, to a
 * destination area they picked from the /api/shipping/areas autocomplete. Body:
 * { destinationAreaId: string, items: [{ productId, qty }] } — non-smart_plug items (installation
 * service, extra console) are silently ignored here since they never ship.
 *
 * Gated the same as checkout itself (manage_settings) since this is part of the money-affecting
 * checkout flow, not a passive lookup like /api/shipping/areas.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa mengatur langganan." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const destinationAreaId = String(body.destinationAreaId || "").trim();
    if (!destinationAreaId) return NextResponse.json({ error: "Area tujuan pengiriman wajib dipilih." }, { status: 400 });

    const requested: { productId: string; qty: number }[] = Array.isArray(body.items) ? body.items : [];
    const productIds = requested.map((i) => i.productId).filter(Boolean);
    if (productIds.length === 0) return NextResponse.json({ error: "Tidak ada Smart Plug di keranjang." }, { status: 400 });

    const products = await db
      .select()
      .from(platformProducts)
      .where(inArray(platformProducts.id, productIds));
    const productMap = new Map(products.map((p) => [p.id, p]));

    const items = requested
      .map((r) => {
        const p = productMap.get(r.productId);
        if (!p || p.category !== "smart_plug" || !p.isActive) return null;
        const qty = Math.max(1, Math.round(Number(r.qty) || 0));
        return { name: p.name, value: p.price, weight: p.weightGrams, quantity: qty, length: p.lengthCm, width: p.widthCm, height: p.heightCm };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (items.length === 0) return NextResponse.json({ error: "Tidak ada Smart Plug di keranjang." }, { status: 400 });

    const options = await getRates(destinationAreaId, items);
    return NextResponse.json({ options });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
