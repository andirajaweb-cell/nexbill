import { NextRequest, NextResponse } from "next/server";
import { sellMembership, listMembershipPayments, MEMBERSHIP_PAYMENT_METHODS } from "@/lib/membership/membership-fee";
import { getCurrentShift } from "@/lib/shift/shift";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Lists membership fee payments for this outlet (optionally filtered to one customer — see the Riwayat Pembayaran panel on Membership > Customer detail). */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const customerId = req.nextUrl.searchParams.get("customerId") ?? undefined;
    const rows = await listMembershipPayments({ outletId: session.outletId, customerId });
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** "Jual Keanggotaan" — charges the customer the tier's configured fee (Cash/QRIS only) and assigns them to it immediately. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_membership")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menjual/memperpanjang keanggotaan." }, { status: 403 });
    }

    const body = await req.json();
    if (!body.customerId) return NextResponse.json({ error: "Pilih customer." }, { status: 400 });
    if (!body.membershipTierId) return NextResponse.json({ error: "Pilih tier keanggotaan." }, { status: 400 });
    if (!MEMBERSHIP_PAYMENT_METHODS.includes(body.paymentMethod)) {
      return NextResponse.json({ error: "Metode pembayaran keanggotaan hanya bisa Cash atau QRIS." }, { status: 400 });
    }

    // Auto-attach the cashier's currently-open shift (if any), same as Other Income — so cash
    // collected this way folds into that shift's cash-count reconciliation.
    const currentShift = await getCurrentShift(session.outletId, session.sub);

    const result = await sellMembership({
      outletId: session.outletId,
      customerId: body.customerId,
      membershipTierId: body.membershipTierId,
      paymentMethod: body.paymentMethod,
      staffUserId: session.sub,
      shiftId: currentShift?.id ?? null,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
