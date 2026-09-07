import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { assetMaintenanceLogs, fixedAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { addMaintenancePart } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

/** Attaches one spare part/component usage to a repair ticket — decrements stock immediately (see addMaintenancePart in lib/accounting/asset.ts). Body: { productId, qty }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah maintenance." }, { status: 403 });
    }

    const [ticket] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, id)).limit(1);
    if (!ticket) return NextResponse.json({ error: "Tiket maintenance tidak ditemukan." }, { status: 404 });
    const [asset] = await db.select({ outletId: fixedAssets.outletId }).from(fixedAssets).where(eq(fixedAssets.id, ticket.fixedAssetId)).limit(1);
    if (!asset || asset.outletId !== session.outletId) return NextResponse.json({ error: "Tiket maintenance tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    if (!body.productId) return NextResponse.json({ error: "Pilih sparepart/komponen yang dipakai." }, { status: 400 });

    const partUsed = await addMaintenancePart({ maintenanceLogId: id, productId: body.productId, qty: Number(body.qty) || 1, staffUserId: session.sub });
    return NextResponse.json(partUsed);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
