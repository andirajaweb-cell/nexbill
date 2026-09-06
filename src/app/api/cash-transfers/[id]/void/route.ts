import { NextRequest, NextResponse } from "next/server";
import { voidCashTransfer } from "@/lib/cash/transfers";
import { cashTransfers } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

/** Reverses an already-POSTED transfer (i.e. one that was already approved) — reuses the void_cash_deposit permission since it's the same trust tier for reversing a cash-movement journal. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedRow(cashTransfers, id, "Pindah kas tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "void_cash_deposit")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membatalkan pindah kas." }, { status: 403 });
    }
    const { reason } = await req.json();
    const updated = await voidCashTransfer(id, reason ?? "Dibatalkan", session.sub);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
