import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { checkIpaymuChannels } from "@/lib/payments/adapters/ipaymu";
import { describeError } from "@/lib/api/error";

/**
 * "Status Kanal iPaymu" panel on the Pembayaran page — read-only, so GET (unlike
 * test-connection's POST, which reads a live balance but is framed as "running a test").
 * Reports each iPaymu channel's live FeatureStatus/HealthStatus so an owner can tell a channel
 * that's down on iPaymu's own end apart from a problem in this app's integration.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola pengaturan pembayaran." }, { status: 403 });
    }
    const result = await checkIpaymuChannels();
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
