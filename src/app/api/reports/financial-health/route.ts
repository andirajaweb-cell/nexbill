import { NextRequest, NextResponse } from "next/server";
import { computeFinancialHealth } from "@/lib/reports/financial-health";
import { describeError } from "@/lib/api/error";
import { monthToDateRange, normalizeReportRange } from "@/lib/reports/range";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";


export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Omzet, laba, dan data pelanggan — hanya role dengan izin Laporan (dulu terbuka untuk semua staf yang login).
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat laporan." }, { status: 403 });
    }
    const outletId = session.outletId;
    // Defaults to the current month (WIB) — every ratio here needs a bounded period.
    const defaults = monthToDateRange();
    const range = normalizeReportRange(req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to"));
    const from = range.from ?? defaults.from;
    const to = range.to ?? defaults.to;
    return NextResponse.json(await computeFinancialHealth(outletId, from, to));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
