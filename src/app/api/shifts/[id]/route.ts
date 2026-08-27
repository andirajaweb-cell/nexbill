import { NextRequest, NextResponse } from "next/server";
import { getShiftDetail, deleteShift } from "@/lib/shift/shift";
import { shifts } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { describeError, errorStatus } from "@/lib/api/error";

/**
 * Full shift detail for the history view — includes the denomination
 * breakdown and non-cash balance checks recorded at close. For a still-open
 * shift, cashCounts/balanceChecks are empty and expectedCash/actualCash are
 * null (they're only populated by closeShift), which keeps this route safe
 * to call before closing without ever leaking the blind-count expected
 * figures ahead of time.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await requireOwnedRow(shifts, id, "Shift tidak ditemukan.");
    const detail = await getShiftDetail(id);
    if (!detail) return NextResponse.json({ error: "Shift tidak ditemukan." }, { status: 404 });
    return NextResponse.json(detail);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}

/**
 * Delete a shift from "Riwayat Shift" — Owner/Superuser only (the two full-authority roles, same
 * gate as Reset Data / branch archive elsewhere in this app), re-checked here regardless of
 * whatever the permission matrix says, since this is a destructive audit-trail action. Ownership
 * (requireOwnedRow) still applies first so nobody can even probe another outlet's shift id.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedRow(shifts, id, "Shift tidak ditemukan.");
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menghapus riwayat shift." }, { status: 403 });
    }
    const result = await deleteShift(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
