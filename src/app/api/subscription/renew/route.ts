import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { requestManualRenewal } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";

/**
 * "Perpanjang Sekarang" — merchant-initiated renewal for an outlet that's already
 * active/grace/suspended (has subscribed before). Creates (or returns the existing) unpaid
 * subscription_fee invoice for the upcoming period, same invoice shape the scheduler would
 * eventually generate on its own — this just lets the outlet pay ahead instead of waiting.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser yang bisa mengatur langganan." }, { status: 403 });
    }

    const invoice = await requestManualRenewal(session.outletId);
    return NextResponse.json({ invoice });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
