import { NextRequest, NextResponse } from "next/server";
import { removeAccessory } from "@/lib/rental/accessories";
import { requireOwnedSessionAccessory } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

/** Stops the per-hour clock early — the customer has returned the accessory before the session ended. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireOwnedSessionAccessory(id);
    return NextResponse.json(await removeAccessory(id));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
