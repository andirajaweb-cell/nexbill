import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { checkoutProductOrder } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";

/**
 * "Toko" tab checkout — standalone purchase of NEXBILL's physical products (Smart Plug, other
 * merchandise) and services, decoupled from the subscription-fee checkout at
 * /api/subscription/checkout (see checkoutProductOrder's own doc comment in
 * lib/subscription/service.ts for why). Deliberately NOT gated by subscription status — no
 * isLocked/isPaid check here, unlike most of this app's dashboard routes — per the owner's
 * explicit choice: an outlet can buy hardware even while its software access is locked, since the
 * two are unrelated. manage_settings is still required, same as any other money-moving action.
 * Body: { items: [{ productId, qty }], installContactName?, installContactPhone?,
 * shippingAddress?, shippingDestinationAreaId?, shippingDestinationAreaLabel?, shippingCourierCode?,
 * shippingCourierServiceName? }.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa checkout di Toko." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const invoice = await checkoutProductOrder({
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
