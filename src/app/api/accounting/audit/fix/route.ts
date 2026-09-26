import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { applyAuditFix, type AuditCode } from "@/lib/accounting/audit";

/**
 * Applies one audit check's automatic fix. Same trust level as posting a manual journal
 * (post_manual_journal) — every fix writes correcting/reversing journals.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "post_manual_journal")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin memperbaiki pembukuan." }, { status: 403 });
    }
    const { code } = await req.json();
    const result = await applyAuditFix(session.outletId, code as AuditCode, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
