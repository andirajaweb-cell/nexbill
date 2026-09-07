import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { assetMaintenanceLogs, assetMaintenancePartsUsed, fixedAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { removeMaintenancePart } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

/** Un-attaches a spare part usage from a ticket and restores its qty to stock (see removeMaintenancePart in lib/accounting/asset.ts). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; partId: string }> }) {
  try {
    const { id, partId } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah maintenance." }, { status: 403 });
    }

    const [partUsed] = await db.select().from(assetMaintenancePartsUsed).where(eq(assetMaintenancePartsUsed.id, partId)).limit(1);
    if (!partUsed || partUsed.maintenanceLogId !== id) return NextResponse.json({ error: "Data pemakaian sparepart tidak ditemukan." }, { status: 404 });
    const [ticket] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, id)).limit(1);
    if (!ticket) return NextResponse.json({ error: "Tiket maintenance tidak ditemukan." }, { status: 404 });
    const [asset] = await db.select({ outletId: fixedAssets.outletId }).from(fixedAssets).where(eq(fixedAssets.id, ticket.fixedAssetId)).limit(1);
    if (!asset || asset.outletId !== session.outletId) return NextResponse.json({ error: "Tiket maintenance tidak ditemukan." }, { status: 404 });

    const result = await removeMaintenancePart(partId, session.sub);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
