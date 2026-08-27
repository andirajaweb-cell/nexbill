import { NextRequest, NextResponse } from "next/server";
import { generateDueRecurringExpenses } from "@/lib/accounting/expense";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Manually triggered (button in the UI) — no background job scheduler in this app. Creates one draft expense per active template whose nextDueDate has arrived. */
export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_expenses")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin generate recurring expense." }, { status: 403 });
    }
    const generated = await generateDueRecurringExpenses(session.outletId);
    return NextResponse.json({ generatedCount: generated.length, generatedIds: generated });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
