import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { listPeriods, closePeriod } from "@/lib/accounting/periods";
import { describeError } from "@/lib/api/error";

/** Lists every period row an outlet has ever touched (closed, or closed-then-reopened) — a period never appearing here is implicitly still open. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_accounting")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat data accounting." }, { status: 403 });
    }
    const rows = await listPeriods(session.outletId);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Closes a period ("YYYY-MM") — postJournal rejects any new posting whose entryDate falls inside it from this point on. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "close_period")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menutup periode akuntansi." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const period = String(body.period ?? "");
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return NextResponse.json({ error: 'Format periode harus "YYYY-MM", mis. "2026-08".' }, { status: 400 });
    }

    const row = await closePeriod(session.outletId, period, session.sub, body.note || undefined);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
