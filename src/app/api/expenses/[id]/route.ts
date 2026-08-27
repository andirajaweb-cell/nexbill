import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { requireOwnedExpense } from "@/lib/accounting/expense-guard";
import { describeError, errorStatus } from "@/lib/api/error";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { expense } = await requireOwnedExpense(id);
    return NextResponse.json(expense);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}

const EDITABLE_FIELDS = [
  "accountId", "category", "description", "payeeName", "supplierId", "qty", "amount", "taxAmount",
  "paymentMethod", "cashBankAccountId", "recordAsPayable", "costCenterId", "rentalUnitId", "dueDate",
  "attachmentUrl", "expenseDate",
] as const;

/** Only editable while still a draft or rejected (not yet posted to any journal). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { session, expense: existing } = await requireOwnedExpense(id);
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah expense." }, { status: 403 });
    }
    if (!["draft", "rejected"].includes(existing.status)) {
      return NextResponse.json({ error: `Expense berstatus "${existing.status}" sudah terposting/diproses — tidak bisa diedit langsung.` }, { status: 400 });
    }

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    if (existing.status === "rejected") {
      patch.status = "draft";
      patch.rejectedBy = null;
      patch.rejectedAt = null;
      patch.rejectReason = null;
    }

    const [updated] = await db.update(expenses).set(patch).where(eq(expenses.id, id)).returning();
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
