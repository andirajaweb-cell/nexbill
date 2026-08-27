import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { assetMaintenanceLogs, fixedAssets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateMaintenanceLog, deleteMaintenanceLog } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";

/** assetMaintenanceLogs has no outletId of its own — scoped indirectly through its parent fixed asset, same pattern as lib/auth/scope.ts's requireOwnedOrderItem. */
async function requireOwnedTicket(id: string) {
  const session = await getSession();
  if (!session) throw Object.assign(new Error("Belum login."), { status: 401 });
  const [ticket] = await db.select().from(assetMaintenanceLogs).where(eq(assetMaintenanceLogs.id, id)).limit(1);
  if (!ticket) throw Object.assign(new Error("Tiket maintenance tidak ditemukan."), { status: 404 });
  const [asset] = await db.select({ outletId: fixedAssets.outletId }).from(fixedAssets).where(eq(fixedAssets.id, ticket.fixedAssetId)).limit(1);
  if (!asset || asset.outletId !== session.outletId) throw Object.assign(new Error("Tiket maintenance tidak ditemukan."), { status: 404 });
  return { session, ticket };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedTicket(id);
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah maintenance." }, { status: 403 });
    }
    const body = await req.json();
    const updated = await updateMaintenanceLog(id, { description: body.description, cost: body.cost !== undefined ? Number(body.cost) : undefined });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { session } = await requireOwnedTicket(id);
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus maintenance." }, { status: 403 });
    }
    const result = await deleteMaintenanceLog(id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
