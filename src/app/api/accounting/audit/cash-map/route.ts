import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { auditCashBankAccounts } from "@/lib/accounting/audit/cash-accounts";

/** Peta Kas & Bank ↔ COA untuk tab Audit: setiap akun kas/bank, akun COA-nya, metode yang masuk ke sana, saldo, dan asal-usul mutasinya. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_accounting")) {
      return NextResponse.json({ error: "Role kamu tidak punya akses Accounting." }, { status: 403 });
    }
    return NextResponse.json(await auditCashBankAccounts(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
