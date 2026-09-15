import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { createIpaymuSandboxTestCheckout } from "@/lib/payments/adapters/ipaymu";
import { db } from "@/db/client";
import { platformIpaymuSandboxTests } from "@/db/schema";
import { describeError } from "@/lib/api/error";

// Small, fixed test amount — this only needs to prove checkout -> pay -> webhook actually works
// end to end, not exercise arbitrary amounts. iPaymu's sandbox simulator accepts any amount.
const TEST_AMOUNT = 10000;

/**
 * Starts a "Ujicoba Transaksi Sandbox" run — see createIpaymuSandboxTestCheckout's doc comment in
 * lib/payments/adapters/ipaymu.ts for the full isolation story (separate credentials, separate
 * webhook, separate DB table, referenceId always prefixed NEXBILL-SANDBOXTEST-). Superuser-only.
 */
export async function POST() {
  try {
    const admin = await requirePlatformAdmin();
    const referenceId = `NEXBILL-SANDBOXTEST-${Date.now()}`;
    const result = await createIpaymuSandboxTestCheckout(referenceId, TEST_AMOUNT);

    if (!result.configured) {
      return NextResponse.json(
        { error: "IPAYMU_SANDBOX_BASE_URL/IPAYMU_SANDBOX_VA/IPAYMU_SANDBOX_API_KEY belum diisi di environment variables server." },
        { status: 400 }
      );
    }
    if (result.error || !result.checkoutUrl) {
      return NextResponse.json({ error: result.error ?? "iPaymu sandbox tidak mengembalikan URL checkout." }, { status: 400 });
    }

    await db.insert(platformIpaymuSandboxTests).values({
      referenceId,
      amount: TEST_AMOUNT,
      status: "pending",
      createdByPlatformAdminId: admin.sub,
    });

    return NextResponse.json({ checkoutUrl: result.checkoutUrl, referenceId, amount: TEST_AMOUNT });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
