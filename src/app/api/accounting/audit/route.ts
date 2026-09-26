import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { runAccountingAudit } from "@/lib/accounting/audit";

/** Runs every accounting audit check for the caller's outlet (read-only). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_accounting")) {
      return NextResponse.json({ error: "Role kamu tidak punya akses Accounting." }, { status: 403 });
    }
    const checks = await runAccountingAudit(session.outletId);
    return NextResponse.json({ checkedAt: new Date().toISOString(), checks, canFix: hasPermission(session.role as StaffRole, "post_manual_journal") });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
