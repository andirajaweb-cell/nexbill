import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { fixedAssets, rentalUnits, suppliers, cashBankAccounts, assetMaintenanceLogs, assetDepreciationEntries } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { createAssetPurchase } from "@/lib/accounting/asset-purchase";
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
    // Only this outlet's rows — these tables have no outletId of their own, so they are scoped
    // through the outlet's asset ids in SQL (the old version loaded every outlet's rows and filtered
    // them in memory).
    const [maintenance, depreciation] = await Promise.all([
      assetIds.length ? db.select().from(assetMaintenanceLogs).where(inArray(assetMaintenanceLogs.fixedAssetId, assetIds)) : Promise.resolve([]),
      assetIds.length ? db.select().from(assetDepreciationEntries).where(inArray(assetDepreciationEntries.fixedAssetId, assetIds)) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      assets,
      rentalUnits: units,
      suppliers: supplierRows,
      cashBankAccounts: cashBank,
      maintenanceLogs: maintenance,
      depreciationEntries: depreciation,
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

    // "+ Aset Baru" (one asset) is a one-line Pembelian Aset: same journal, and when recorded as a
    // payable it now shows up in Accounting → Utang and can actually be paid off — the old
    // createFixedAsset path booked the payable with no document to pay it against.
    const body = await req.json();
    const result = await createAssetPurchase({
      outletId: session.outletId,
      staffUserId: session.sub,
      supplierId: body.supplierId || null,
      purchaseDate: body.acquisitionDate || null,
      items: [
        {
          name: body.name,
          category: body.category,
          qty: 1,
          unitCost: Number(body.acquisitionCost),
          usefulLifeMonths: Number(body.usefulLifeMonths),
          salvageValue: Number(body.salvageValue) || 0,
          rentalUnitId: body.rentalUnitId || null,
        },
      ],
      funding: body.funding ?? (body.recordAsPayable ? "payable" : "paid"),
      cashBankAccountId: body.cashBankAccountId || null,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
    });
    return NextResponse.json(result.assets[0]);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
