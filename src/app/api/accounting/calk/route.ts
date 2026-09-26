import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { buildCalk } from "@/lib/accounting/calk";

/** Catatan atas Laporan Keuangan (SAK EMKM) for the caller's outlet and period. */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_accounting")) {
      return NextResponse.json({ error: "Role kamu tidak punya akses Accounting." }, { status: 403 });
    }
    const from = req.nextUrl.searchParams.get("from") ?? undefined;
    const to = req.nextUrl.searchParams.get("to") ?? undefined;
    return NextResponse.json(await buildCalk(session.outletId, from, to));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
