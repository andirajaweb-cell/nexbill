import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { reopenPeriod } from "@/lib/accounting/periods";
import { describeError } from "@/lib/api/error";

/** Reopens a previously-closed period ("YYYY-MM") — kept as a separate, higher-trust permission (owner/superuser only) than close_period, same segregation-of-duty pattern as manage_expenses/void_expense. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "reopen_period")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuka kembali periode akuntansi yang sudah ditutup." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const period = String(body.period ?? "");
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: 'Format periode harus "YYYY-MM", mis. "2026-08".' }, { status: 400 });
    }

    const row = await reopenPeriod(session.outletId, period, session.sub, body.note || undefined);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
