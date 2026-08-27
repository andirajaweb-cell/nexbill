import { NextRequest, NextResponse } from "next/server";
import { describeError, errorStatus } from "@/lib/api/error";
import { splitOrderEvenly } from "@/lib/pos/split-merge";
import { requireOwnedOrder } from "@/lib/pos/order-guard";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { parts } = await req.json();
  try {
    await requireOwnedOrder(id);
    return NextResponse.json(await splitOrderEvenly(id, parts));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
