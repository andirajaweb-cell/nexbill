import { NextRequest, NextResponse } from "next/server";
import { getHomeRentalReports } from "@/lib/home-rental/reports";
import { describeError } from "@/lib/api/error";
import { normalizeReportRange } from "@/lib/reports/range";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";

/**
 * Home Rental revenue/operations report for the main Laporan & Analitik page — same underlying
 * getHomeRentalReports bundle the Home Rental module's own Laporan tab uses, just exposed here so
 * "sewa 12/24 jam, delivery, TV, accessory, penggantian kerusakan, denda, dst" all show up in one
 * consolidated place alongside Penjualan/Rental(in-house)/Inventori/Pelanggan/Beban, as asked.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Omzet, laba, dan data pelanggan — hanya role dengan izin Laporan (dulu terbuka untuk semua staf yang login).
    if (!hasPermission(session.role as StaffRole, "view_reports")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat laporan." }, { status: 403 });
    }
    const outletId = session.outletId;
    const range = normalizeReportRange(req.nextUrl.searchParams.get("from"), req.nextUrl.searchParams.get("to"));
    const to = range.to ?? new Date().toISOString();
    const from = range.from ?? new Date(new Date(to).getTime() - 30 * 86400000).toISOString();
    return NextResponse.json(await getHomeRentalReports({ outletId, from, to }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
