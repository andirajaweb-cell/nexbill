import { NextRequest, NextResponse } from "next/server";
import { editCashTransfer } from "@/lib/cash/transfers";
import { cashTransfers } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";
import { resolveDrawerShiftId } from "@/lib/shift/drawer";
import { isTodayYmd, ymdToEntryIso } from "@/lib/time/entry-date";

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/**
 * PATCH — koreksi Pindah Kas (lihat editCashTransfer).
 *  - Menunggu persetujuan: pengaju sendiri, atau yang berhak menyetujui.
 *  - Sudah diposting: hanya yang berhak menyetujui (approve_requests) — sama dengan tingkat yang
 *    memposting jurnalnya.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session, row } = await requireOwnedRow<typeof cashTransfers.$inferSelect>(cashTransfers, id, "Pindah kas tidak ditemukan.");
    const role = session.role as StaffRole;
    const canApprove = hasPermission(role, "approve_requests");
    if (!hasPermission(role, "manage_cash_deposit") && !canApprove) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah pindah kas." }, { status: 403 });
    }
    if (row.status === "pending_approval" && !canApprove && row.requestedByStaffUserId !== session.sub) {
      return NextResponse.json({ error: "Hanya pengaju atau Owner/Manager yang bisa mengubah permintaan pindah kas ini." }, { status: 403 });
    }
    const body = await req.json();
    const ymd = str(body.date) ?? null;
    const updated = await editCashTransfer(
      id,
      {
        ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
        sourceCashBankAccountId: str(body.sourceCashBankAccountId),
        destinationCashBankAccountId: str(body.destinationCashBankAccountId),
        ...("notes" in body ? { notes: typeof body.notes === "string" ? body.notes : null } : {}),
        ...(ymd ? { entryDate: ymdToEntryIso(ymd), shiftId: isTodayYmd(ymd) ? await resolveDrawerShiftId(session.outletId, session.sub) : null } : {}),
      },
      { id: session.sub, canEditPosted: canApprove }
    );
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
