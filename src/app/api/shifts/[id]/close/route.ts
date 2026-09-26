import { NextRequest, NextResponse } from "next/server";
import { closeShift } from "@/lib/shift/shift";
import { shifts } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";

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
    const { session, row: shift } = await requireOwnedRow<typeof shifts.$inferSelect>(shifts, id, "Shift tidak ditemukan.");
    // Only the shift's own cashier closes it — or a Supervisor/Manager/Owner (approve_requests)
    // closing a stuck/abandoned shift, with a mandatory reason (flagged closed_by_other). Before
    // this, ANY staff member of the outlet could close anyone's shift with any count.
    if (shift.staffUserId !== session.sub && !hasPermission(session.role as StaffRole, "approve_requests")) {
      return NextResponse.json({ error: "Hanya kasir pemilik shift, atau Supervisor/Manager/Owner, yang bisa menutup shift ini." }, { status: 403 });
    }
    const result = await closeShift(id, {
      cashCounts: Array.isArray(body.cashCounts) ? body.cashCounts : [],
      balanceChecks: Array.isArray(body.balanceChecks) ? body.balanceChecks : [],
      notes: body.notes,
      closingFloat: body.closingFloat == null || body.closingFloat === "" ? null : Number(body.closingFloat),
      closedBy: session.sub,
      closeNote: typeof body.closeNote === "string" ? body.closeNote : null,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
