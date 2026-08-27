import { NextRequest, NextResponse } from "next/server";
import { cancelExpense } from "@/lib/accounting/expense";
import { requireOwnedExpense } from "@/lib/accounting/expense-guard";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedExpense(id);
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membatalkan expense." }, { status: 403 });
    }
    const { reason } = await req.json();
    return NextResponse.json(await cancelExpense(id, session.sub, reason ?? ""));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
