import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalRentals, homeRentalRentalAssets, homeRentalAssets } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, id)).limit(1);
    if (!rental || rental.outletId !== session.outletId) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });
    const links = await db.select().from(homeRentalRentalAssets).where(eq(homeRentalRentalAssets.rentalId, id));
    const assetIds = links.map((l) => l.assetId);
    const assets = assetIds.length ? await db.select().from(homeRentalAssets).where(inArray(homeRentalAssets.id, assetIds)) : [];
    return NextResponse.json({ ...rental, assets });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

// Only identity-document fields are editable here after the fact (e.g. attach a KTP photo that
// wasn't captured at booking time) — status transitions go through the dedicated checkout/
// return/cancel/approval routes, and the verification checklist through /verify.
const EDITABLE_DOC_FIELDS = new Set([
  "customerIdentityNumber", "customerIdentityImageUrl",
  "studentIdNumber", "studentIdImageUrl",
  "parentName", "parentIdentityNumber", "parentIdentityImageUrl",
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [existingRental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, id)).limit(1);
    if (!existingRental || existingRental.outletId !== session.outletId) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (EDITABLE_DOC_FIELDS.has(key)) patch[key] = body[key];
    }
    if (Object.keys(patch).length === 0) return NextResponse.json({ error: "Tidak ada field dokumen yang valid untuk diubah." }, { status: 400 });
    patch.updatedAt = new Date().toISOString();
    const [row] = await db.update(homeRentalRentals).set(patch).where(eq(homeRentalRentals.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
