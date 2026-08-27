import { NextRequest, NextResponse } from "next/server";
import { voidExpense } from "@/lib/accounting/expense";
import { requireOwnedExpense } from "@/lib/accounting/expense-guard";
import type { StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedExpense(id);
    const { reason } = await req.json();
    return NextResponse.json(await voidExpense(id, session.sub, session.role as StaffRole, reason ?? ""));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
