import { NextRequest, NextResponse } from "next/server";
import { logMaintenance } from "@/lib/accounting/asset";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { fixedAssets } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Logs a maintenance event; if createExpenseFor + cost > 0, also creates and submits a real Expense (Beban Maintenance) linked back to this asset. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_assets")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mencatat maintenance." }, { status: 403 });
    }
    const [existingAsset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, id)).limit(1);
    if (!existingAsset || existingAsset.outletId !== session.outletId) return NextResponse.json({ error: "Aset tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    if (!body.description) return NextResponse.json({ error: "Deskripsi maintenance wajib diisi." }, { status: 400 });
    return NextResponse.json(await logMaintenance({ ...body, fixedAssetId: id, staffUserId: session.sub }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
