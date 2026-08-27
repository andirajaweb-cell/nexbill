import { NextRequest, NextResponse } from "next/server";
import { payExpense } from "@/lib/accounting/expense";
import { requireOwnedExpense } from "@/lib/accounting/expense-guard";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedExpense(id);
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membayar expense." }, { status: 403 });
    }
    const { method, cashBankAccountId } = await req.json();
    if (!method || !cashBankAccountId) return NextResponse.json({ error: "method dan cashBankAccountId wajib diisi." }, { status: 400 });
    return NextResponse.json(await payExpense(id, session.sub, method, cashBankAccountId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
