import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { requestAiAddonActivation } from "@/lib/subscription/service";
import { describeError } from "@/lib/api/error";

/**
 * "Aktifkan AI Add-on" — creates (or returns the existing) unpaid "ai_addon" invoice for this
 * outlet. Paying it via the normal invoice payment flow (initiateInvoicePayment +
 * confirmInvoicePayment, same QRIS/VA/cash plumbing as any other subscription invoice) is what
 * actually flips subscriptions.aiAddonActive on — this route only creates the invoice to pay.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Superuser/Owner yang bisa mengatur langganan." }, { status: 403 });
    }

    const invoice = await requestAiAddonActivation(session.outletId);
    return NextResponse.json({ invoice });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
