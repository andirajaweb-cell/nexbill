import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { checkIpaymuChannels } from "@/lib/payments/adapters/ipaymu";
import { describeError } from "@/lib/api/error";

/** Moved here from /api/payment-methods/ipaymu/channels on 2026-09-13 — see the doc comment on
 * ./test-connection/route.ts's move for why: this reports the shared platform-wide iPaymu
 * account's channel health, not anything scoped to an individual outlet. */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const result = await checkIpaymuChannels();
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
