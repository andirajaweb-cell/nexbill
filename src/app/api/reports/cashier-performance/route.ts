import { NextRequest, NextResponse } from "next/server";
import { computeCashierPerformance } from "@/lib/reports/transactions";
import { getSession } from "@/lib/auth/session";
import { normalizeReportRange } from "@/lib/reports/range";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat laporan performa kasir." }, { status: 403 });
    }

    const outletId = session.outletId;
    const { from, to } = normalizeReportRange(req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to"));

    const rows = await computeCashierPerformance(outletId, from, to);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
