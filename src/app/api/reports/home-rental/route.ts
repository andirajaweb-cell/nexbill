import { NextRequest, NextResponse } from "next/server";
import { getHomeRentalReports } from "@/lib/home-rental/reports";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

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
    const outletId = session.outletId;
    const to = req.nextUrl.searchParams.get("to") || new Date().toISOString();
    const from = req.nextUrl.searchParams.get("from") || new Date(new Date(to).getTime() - 30 * 86400000).toISOString();
    return NextResponse.json(await getHomeRentalReports({ outletId, from, to }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
