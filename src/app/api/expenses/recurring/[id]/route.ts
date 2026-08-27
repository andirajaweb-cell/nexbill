import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { recurringExpenseTemplates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

const EDITABLE_FIELDS = [
  "name", "accountId", "category", "costCenterId", "rentalUnitId", "payeeName", "supplierId",
  "amount", "taxAmount", "recordAsPayable", "frequency", "dayOfMonth", "nextDueDate", "isActive",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah recurring expense." }, { status: 403 });
    }
    const [existing] = await db.select().from(recurringExpenseTemplates).where(eq(recurringExpenseTemplates.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) if (body[key] !== undefined) patch[key] = body[key];
    const [updated] = await db.update(recurringExpenseTemplates).set(patch).where(eq(recurringExpenseTemplates.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Deactivate rather than hard-delete, so already-generated expense instances keep a valid recurringTemplateId reference. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus recurring expense." }, { status: 403 });
    }
    const [existing] = await db.select().from(recurringExpenseTemplates).where(eq(recurringExpenseTemplates.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });

    const [updated] = await db.update(recurringExpenseTemplates).set({ isActive: false }).where(eq(recurringExpenseTemplates.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Template tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
