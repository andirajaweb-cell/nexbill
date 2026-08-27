import { NextRequest, NextResponse } from "next/server";
import { requestRefundOrder } from "@/lib/pos/refund";
import { requireOwnedOrder } from "@/lib/pos/order-guard";
import type { StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

/** staffUserId/role now come from the verified session cookie, not the request body. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reason } = await req.json();
  try {
    const { session } = await requireOwnedOrder(id);
    const result = await requestRefundOrder(id, session.sub, session.role as StaffRole, reason ?? "");
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
