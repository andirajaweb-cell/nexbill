import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { createCashDeposit, listCashDeposits } from "@/lib/cash/deposits";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const shiftId = req.nextUrl.searchParams.get("shiftId") ?? undefined;
    const rows = await listCashDeposits(session.outletId, shiftId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Records a cash pickup/deposit — see lib/cash/deposits.ts for the accounting behind each purposeType. outletId/recordedByStaffUserId always come from the session, never the request body. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_cash_deposit")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mencatat setoran kas." }, { status: 403 });
    }

    const body = await req.json();
    const row = await createCashDeposit({
      outletId: session.outletId,
      shiftId: body.shiftId ?? null,
      amount: Number(body.amount),
      purposeType: body.purposeType,
      sourceCashBankAccountId: body.sourceCashBankAccountId,
      destinationCashBankAccountId: body.destinationCashBankAccountId ?? null,
      receivedByStaffUserId: body.receivedByStaffUserId,
      recordedByStaffUserId: session.sub,
      notes: body.notes ?? null,
    });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
