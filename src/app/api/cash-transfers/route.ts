import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { requestCashTransfer, listCashTransfers } from "@/lib/cash/transfers";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const shiftId = req.nextUrl.searchParams.get("shiftId") ?? undefined;
    const rows = await listCashTransfers(session.outletId, shiftId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * Submits a "Pindah Kas" request — this only ever creates a pending row (see lib/cash/transfers.ts,
 * requestCashTransfer); the journal isn't posted until an Owner/Manager approves it via the
 * standard /api/approvals/[id]/approve endpoint. outletId/requestedByStaffUserId always come from
 * the session, never the request body.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_cash_deposit")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengajukan pindah kas." }, { status: 403 });
    }

    const body = await req.json();
    const row = await requestCashTransfer({
      outletId: session.outletId,
      shiftId: body.shiftId ?? null,
      amount: Number(body.amount),
      sourceCashBankAccountId: body.sourceCashBankAccountId,
      destinationCashBankAccountId: body.destinationCashBankAccountId,
      notes: body.notes ?? null,
      requestedByStaffUserId: session.sub,
      requesterRole: session.role as StaffRole,
    });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
