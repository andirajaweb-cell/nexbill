import { NextRequest, NextResponse } from "next/server";
import { voidCashDeposit } from "@/lib/cash/deposits";
import { cashDeposits } from "@/db/schema";
import { requireOwnedRow } from "@/lib/auth/scope";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedRow(cashDeposits, id, "Setoran kas tidak ditemukan.");
    if (!hasPermission(session.role as StaffRole, "void_cash_deposit")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membatalkan setoran kas." }, { status: 403 });
    }
    const { reason } = await req.json();
    const updated = await voidCashDeposit(id, reason ?? "Dibatalkan", session.sub);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
