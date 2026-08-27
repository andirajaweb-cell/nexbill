import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { checkoutCart } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";

/**
 * Kicks off the etalase/cart checkout for the current outlet — one combined invoice for the
 * mandatory subscription fee plus whatever the merchant put in their cart (free-form quantities
 * of smart plug variants, installation service, extra console slots; see checkoutCart() in
 * lib/subscription/service.ts). Body: { items: [{ productId, qty }], installContactName?,
 * installContactPhone?, shippingAddress? }.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa mengatur langganan." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const invoice = await checkoutCart({
      outletId: session.outletId,
      items: Array.isArray(body.items) ? body.items : [],
      installContactName: body.installContactName,
      installContactPhone: body.installContactPhone,
      shippingAddress: body.shippingAddress,
      shippingDestinationAreaId: body.shippingDestinationAreaId,
      shippingDestinationAreaLabel: body.shippingDestinationAreaLabel,
      shippingCourierCode: body.shippingCourierCode,
      shippingCourierServiceName: body.shippingCourierServiceName,
    });
    return NextResponse.json({ invoice });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
