import { NextRequest, NextResponse } from "next/server";
import { getRequiredBalanceChannels } from "@/lib/shift/shift";
import { shifts } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

/** Which non-cash channels the closing form must ask for on this specific shift (only channels that actually had activity, plus the PPOB Fastpay saldo check every time). Channel list only, not amounts — safe to expose before close without breaking the blind-count design. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireOwnedRow(shifts, id, "Shift tidak ditemukan.");
    const channels = await getRequiredBalanceChannels(id);
    return NextResponse.json(channels);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
