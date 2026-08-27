import { NextRequest, NextResponse } from "next/server";
import { runDepreciationForAllAssets } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Bulk-runs one depreciation period for every active asset in the outlet — used by the "Jalankan Penyusutan Bulan Ini" button. Per-asset errors (already run, fully depreciated) are collected, not thrown. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menjalankan penyusutan." }, { status: 403 });
    }
    const { period } = await req.json();
    if (!period) return NextResponse.json({ error: "period ('YYYY-MM') wajib diisi." }, { status: 400 });
    return NextResponse.json(await runDepreciationForAllAssets(session.outletId, period, session.sub));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
