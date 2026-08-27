import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { getHomeRentalReports } from "@/lib/home-rental/reports";

/** Full Home Rental report bundle for a period. ?from=ISO&to=ISO — defaults to the last 30 days. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental") && !hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat laporan Home Rental." }, { status: 403 });
    }
    const outletId = session.outletId;
    const to = req.nextUrl.searchParams.get("to") || new Date().toISOString();
    const from = req.nextUrl.searchParams.get("from") || new Date(new Date(to).getTime() - 30 * 86400000).toISOString();

    const report = await getHomeRentalReports({ outletId, from, to });
    return NextResponse.json(report);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
