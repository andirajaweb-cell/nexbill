import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fixedAssets, rentalUnits } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { filterAssets, filterFromParams, isFilterActive } from "@/lib/assets/asset-filter";
import { buildAssetListXlsx } from "@/lib/assets/asset-xlsx";
import { parseLang } from "@/lib/assets/lang";
import { outletDateYmd } from "@/lib/time/outlet-time";

/**
 * Unduh Daftar Aset (.xlsx) dengan filter yang SAMA dengan tampilan (?q, category, status, unit,
 * from, to — lihat lib/assets/asset-filter.ts). Siapa pun yang bisa membuka halaman Aset boleh
 * mengunduh; data dibatasi ke outlet sesi.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const params = req.nextUrl.searchParams;
    const filter = filterFromParams(params);
    const lang = parseLang(params.get("lang"));

    const [assets, units] = await Promise.all([
      db.select().from(fixedAssets).where(eq(fixedAssets.outletId, session.outletId)).orderBy(desc(fixedAssets.acquisitionDate)),
      db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(eq(rentalUnits.outletId, session.outletId)),
    ]);
    const unitNames = Object.fromEntries(units.map((u) => [u.id, u.name]));
    const rows = filterAssets(assets, filter, unitNames);
    const label = params.get("label")?.slice(0, 200) || (isFilterActive(filter) ? "Terfilter" : "Semua aset");

    const buffer = buildAssetListXlsx(rows, unitNames, lang, label);
    const stamp = outletDateYmd(new Date()).replace(/-/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="daftar-aset-${stamp}.xlsx"`,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
