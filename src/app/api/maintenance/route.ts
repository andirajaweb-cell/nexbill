import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { fixedAssets, assetMaintenanceLogs, cashBankAccounts } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { logMaintenance } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/**
 * Standalone list/create endpoint for the Maintenance module (/dashboard/maintenance) — separate
 * from /api/assets/[id]/maintenance (which stays as the quick "+ Maintenance" shortcut on the
 * Assets page, tied to one specific asset). Both ultimately call the same lib/accounting/asset.ts
 * logMaintenance(), so a ticket created from either entry point behaves identically (same status
 * workflow, same asset.status sync).
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;

    const assets = await db.select().from(fixedAssets).where(eq(fixedAssets.outletId, outletId)).orderBy(desc(fixedAssets.acquisitionDate));
    const assetIds = assets.map((a) => a.id);
    const [tickets, cashBank] = await Promise.all([
      assetIds.length ? db.select().from(assetMaintenanceLogs).where(inArray(assetMaintenanceLogs.fixedAssetId, assetIds)).orderBy(desc(assetMaintenanceLogs.maintenanceDate)) : Promise.resolve([]),
      db.select().from(cashBankAccounts).where(eq(cashBankAccounts.outletId, outletId)),
    ]);

    return NextResponse.json({ assets, tickets, cashBankAccounts: cashBank });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mencatat maintenance." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.fixedAssetId) return NextResponse.json({ error: "Pilih aset yang mau di-maintenance." }, { status: 400 });
    if (!body.description) return NextResponse.json({ error: "Deskripsi maintenance wajib diisi." }, { status: 400 });

    const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, body.fixedAssetId)).limit(1);
    if (!asset || asset.outletId !== session.outletId) return NextResponse.json({ error: "Aset tidak ditemukan." }, { status: 404 });

    const ticket = await logMaintenance({ ...body, fixedAssetId: body.fixedAssetId, staffUserId: session.sub });
    return NextResponse.json(ticket);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
