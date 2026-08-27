import { NextRequest, NextResponse } from "next/server";
import { requestVoidItem } from "@/lib/pos/void";
import type { StaffRole } from "@/lib/auth/permissions";
import { requireOwnedOrderItem } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { reason } = await req.json().catch(() => ({}));
  try {
    // staffUserId/role now always come from the verified session — previously trusted from the
    // request body, which let any caller self-assert a higher role (e.g. "superuser") to force
    // an immediate direct void instead of a pending approval.
    const { session } = await requireOwnedOrderItem(id);
    const result = await requestVoidItem(id, session.sub, session.role as StaffRole, reason ?? "");
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
