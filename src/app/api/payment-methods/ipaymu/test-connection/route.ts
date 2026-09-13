import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { checkIpaymuConnection } from "@/lib/payments/adapters/ipaymu";
import { describeError } from "@/lib/api/error";

/**
 * "Test Koneksi iPaymu" button on the Pembayaran page — calls iPaymu's own Check Balance API with
 * the server's configured credentials, so an owner/manager can confirm the integration is actually
 * authenticating against iPaymu right now, not just that a channel has been added to the payment
 * methods list (adding a channel works even in mock mode, when nothing has been tried against
 * iPaymu at all — see checkIpaymuConnection's own doc comment).
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola pengaturan pembayaran." }, { status: 403 });
    }

    const result = await checkIpaymuConnection();
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
