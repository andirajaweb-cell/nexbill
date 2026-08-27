import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalRentals } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { logAudit } from "@/lib/audit/log";

/** Staff verification checklist — KTP, Kartu Pelajar, KTP Orang Tua, and a GetContact cross-check on the renter's phone number. Any subset of fields can be sent; verifiedBy/verifiedAt are stamped from the session on every call. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [existing] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Rental tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    const patch: Record<string, unknown> = { verifiedBy: session.sub, verifiedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    for (const key of ["verifiedKtp", "verifiedStudentId", "verifiedParentId", "verifiedGetContact", "getContactResultName", "verificationNote"]) {
      if (key in body) patch[key] = body[key];
    }

    const [row] = await db.update(homeRentalRentals).set(patch).where(eq(homeRentalRentals.id, id)).returning();
    await logAudit({ outletId: existing.outletId, staffUserId: session.sub, action: "home_rental_verification_updated", entityType: "home_rental_rental", entityId: id, before: existing, after: row });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
