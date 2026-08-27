import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { assetMaintenanceLogs, fixedAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateMaintenanceStatus } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

const VALID_STATUSES = ["queued", "in_progress", "done"] as const;

/** Advances a maintenance ticket through the repair workflow (Masuk Maintenance -> Proses -> Selesai). Body: { status }. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah status maintenance." }, { status: 403 });
    }

    const [ticket] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, id)).limit(1);
    if (!ticket) return NextResponse.json({ error: "Tiket maintenance tidak ditemukan." }, { status: 404 });
    const [asset] = await db.select({ outletId: fixedAssets.outletId }).from(fixedAssets).where(eq(fixedAssets.id, ticket.fixedAssetId)).limit(1);
    if (!asset || asset.outletId !== session.outletId) return NextResponse.json({ error: "Tiket maintenance tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    if (!VALID_STATUSES.includes(body.status)) return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });

    const updated = await updateMaintenanceStatus(id, body.status, session.sub);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
