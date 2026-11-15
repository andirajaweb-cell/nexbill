import { NextRequest, NextResponse } from "next/server";
import { editCashDeposit, type CashDepositPurpose } from "@/lib/cash/deposits";
import { cashDeposits } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";
import { resolveDrawerShiftId } from "@/lib/shift/drawer";
import { isTodayYmd, ymdToEntryIso } from "@/lib/time/entry-date";

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/**
 * PATCH — koreksi Setoran Kas yang sudah diposting (lihat editCashDeposit). Izinnya sama dengan
 * Batalkan (void_cash_deposit): koreksi = membatalkan jurnal lama lalu memposting yang baru.
 * Tanggal hanya lewat `date` (YYYY-MM-DD, tidak boleh ke depan); shift untuk tanggal baru
 * ditentukan server, tidak pernah dari klien.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedRow(cashDeposits, id, "Setoran kas tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "void_cash_deposit")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengoreksi setoran kas." }, { status: 403 });
    }
    const body = await req.json();
    const ymd = str(body.date) ?? null;
    const updated = await editCashDeposit(
      id,
      {
        ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
        purposeType: str(body.purposeType) as CashDepositPurpose | undefined,
        sourceCashBankAccountId: str(body.sourceCashBankAccountId),
        ...("destinationCashBankAccountId" in body ? { destinationCashBankAccountId: str(body.destinationCashBankAccountId) ?? null } : {}),
        receivedByStaffUserId: str(body.receivedByStaffUserId),
        ...("notes" in body ? { notes: typeof body.notes === "string" ? body.notes : null } : {}),
        ...(ymd ? { entryDate: ymdToEntryIso(ymd), shiftId: isTodayYmd(ymd) ? await resolveDrawerShiftId(session.outletId, session.sub) : null } : {}),
      },
      session.sub
    );
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
