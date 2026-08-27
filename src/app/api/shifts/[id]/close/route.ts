import { NextRequest, NextResponse } from "next/server";
import { closeShift } from "@/lib/shift/shift";
import { shifts } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

/**
 * Closes a shift with a full denomination-based cash count + non-cash
 * channel balance checks. Body: { cashCounts: [{denomination,qty}],
 * balanceChecks: [{channelKey,actualBalance}], notes? } — see
 * getRequiredBalanceChannels() for which channelKeys are mandatory for this
 * particular shift (only channels that actually had activity, plus the PPOB
 * Fastpay saldo check every time).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  try {
    await requireOwnedRow(shifts, id, "Shift tidak ditemukan.");
    const result = await closeShift(id, {
      cashCounts: Array.isArray(body.cashCounts) ? body.cashCounts : [],
      balanceChecks: Array.isArray(body.balanceChecks) ? body.balanceChecks : [],
      notes: body.notes,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
