import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { fixedAssets, rentalUnits, suppliers, cashBankAccounts, assetMaintenanceLogs, assetDepreciationEntries } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createFixedAsset } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Lists fixed assets plus the lookup data the Asset UI needs (rental units, suppliers, cash/bank accounts). */
export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;

    const [assets, units, supplierRows, cashBank] = await Promise.all([
      db.select().from(fixedAssets).where(eq(fixedAssets.outletId, outletId)).orderBy(desc(fixedAssets.acquisitionDate)),
      db.select().from(rentalUnits).where(eq(rentalUnits.outletId, outletId)),
      db.select().from(suppliers).where(eq(suppliers.outletId, outletId)),
      db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId)),
    ]);

    const assetIds = assets.map((a) => a.id);
    const [maintenance, depreciation] = await Promise.all([
      assetIds.length ? db.select().from(assetMaintenanceLogs) : Promise.resolve([]),
      assetIds.length ? db.select().from(assetDepreciationEntries) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      assets,
      rentalUnits: units,
      suppliers: supplierRows,
      cashBankAccounts: cashBank,
      maintenanceLogs: maintenance.filter((m) => assetIds.includes(m.fixedAssetId)),
      depreciationEntries: depreciation.filter((d) => assetIds.includes(d.fixedAssetId)),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola aset." }, { status: 403 });
    }

    const body = await req.json();
    const asset = await createFixedAsset({ ...body, staffUserId: session.sub, outletId: session.outletId });
    return NextResponse.json(asset);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
