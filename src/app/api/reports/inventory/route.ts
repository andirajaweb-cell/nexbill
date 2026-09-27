import { NextRequest, NextResponse } from "next/server";
import { computeInventoryReport } from "@/lib/reports/operational";
import { describeError } from "@/lib/api/error";
import { normalizeReportRange } from "@/lib/reports/range";
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
    // "YYYY-MM-DD" → batas hari WIB (lib/reports/range.ts) — dulu hari terakhir periode hilang.
    const { from, to } = normalizeReportRange(req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to"));
    return NextResponse.json(await computeInventoryReport(outletId, from, to));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
