import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { checkIpaymuConnection } from "@/lib/payments/adapters/ipaymu";
import { describeError } from "@/lib/api/error";

/**
 * Moved here from /api/payment-methods/ipaymu/test-connection on 2026-09-13 — IPAYMU_VA/
 * IPAYMU_API_KEY/IPAYMU_BASE_URL are ONE shared platform-wide credential (same account for every
 * outlet's POS/rental checkout AND for NEXBILL's own subscription billing), not something scoped
 * to or configurable by an individual outlet — same reasoning as platformTuyaAccount's "ONE shared
 * ... account used to control devices for every outlet/merchant" (see api/platform-admin/tuya).
 * An outlet Owner testing/seeing this connection's live balance was never actually their own data.
 */
export async function POST() {
  try {
    await requirePlatformAdmin();
    const result = await checkIpaymuConnection();
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
