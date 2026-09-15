import { NextRequest, NextResponse } from "next/server";
import { normalizeIpaymuCallback, verifyIpaymuWebhookSignature, mapIpaymuCallbackStatus } from "@/lib/payments/adapters/ipaymu";
import { db } from "@/db/client";
import { platformIpaymuSandboxTests } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Dedicated webhook for Platform Admin > iPaymu's "Ujicoba Transaksi Sandbox" panel — deliberately
 * separate from both /api/payments/ipaymu/webhook (real POS orders) and
 * /api/subscription/webhook/ipaymu (real subscription billing) so a sandbox test callback can
 * never be mistaken for a real transaction and can never touch real order/invoice data.
 *
 * Verified against IPAYMU_SANDBOX_VA (verifyIpaymuWebhookSignature's `{ sandbox: true }` option),
 * NOT the production VA — a callback signed with the production VA is rejected here just like a
 * genuinely invalid one, and vice versa for the real webhooks.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let payload: Record<string, unknown>;

  if (contentType.includes("application/json")) {
    payload = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData().catch(() => null);
    payload = {};
    if (form) for (const [key, value] of form.entries()) payload[key] = value;
  }

  const normalized = normalizeIpaymuCallback(payload);
  const signature = req.headers.get("x-signature") ?? req.headers.get("X-Signature");

  if (!verifyIpaymuWebhookSignature(normalized, signature, { sandbox: true })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const referenceId = String(normalized.reference_id ?? "");
  // Not one of ours (e.g. a stray/misconfigured callback) — acknowledge harmlessly so iPaymu
  // doesn't retry forever, but never touch the table for anything outside this feature.
  if (!referenceId.startsWith("NEXBILL-SANDBOXTEST-")) return NextResponse.json({ ok: true });

  const mapped = mapIpaymuCallbackStatus(Number(normalized.status_code ?? normalized.transaction_status_code ?? 0));
  const status = mapped === "success" ? "success" : mapped === "failed" ? "failed" : "pending";

  // "pending" callbacks (e.g. an intermediate/escrow notification) leave the row alone — never
  // overwrite an already-terminal success/failed status back to pending.
  if (status !== "pending") {
    await db
      .update(platformIpaymuSandboxTests)
      .set({ status, rawCallback: JSON.stringify(normalized), updatedAt: new Date().toISOString() })
      .where(eq(platformIpaymuSandboxTests.referenceId, referenceId));
  }

  return NextResponse.json({ ok: true });
}
