import { NextRequest, NextResponse } from "next/server";
import { approveExpense } from "@/lib/accounting/expense";
import { requireOwnedExpense } from "@/lib/accounting/expense-guard";
import type { StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session } = await requireOwnedExpense(id);
    return NextResponse.json(await approveExpense(id, session.sub, session.role as StaffRole));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
