import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { advanceItemStatus } from "@/lib/kitchen/queue";
import { requireOwnedOrderItem } from "@/lib/auth/scope";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedOrderItem(id);
    return NextResponse.json(await advanceItemStatus(id, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
