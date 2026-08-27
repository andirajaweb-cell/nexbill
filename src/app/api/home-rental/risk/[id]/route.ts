import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalCustomerRisk } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { setBlacklist, recomputeCustomerRisk } from "@/lib/home-rental/risk";

/**
 * Two kinds of edits on a risk profile, gated differently:
 *  - Identity/verification fields (identityType, identityNumber, emergency contact, notes,
 *    verificationStatus) — anyone with manage_home_rental (front-desk data entry).
 *  - Blacklist toggle (isBlacklisted/blacklistReason) — requires approve_requests, since
 *    blacklisting hard-blocks a customer from booking at all and shouldn't be a cashier-level
 *    decision, same tier as void/refund/approval in this app.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [existing] = await db.select().from(homeRentalCustomerRisk).where(eq(homeRentalCustomerRisk.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Profil risiko tidak ditemukan." }, { status: 404 });

    const body = await req.json();

    if ("isBlacklisted" in body) {
      if (!hasPermission(session.role as StaffRole, "approve_requests")) {
        return NextResponse.json({ error: "Role kamu tidak punya izin blacklist/unblacklist pelanggan." }, { status: 403 });
      }
      const row = await setBlacklist(existing.outletId, existing.phone, !!body.isBlacklisted, session.sub, body.blacklistReason);
      return NextResponse.json(row);
    }

    // riskScore/riskLevel/riskCategory are always DERIVED (see recomputeCustomerRisk) — never
    // accepted directly from the client, even though a naive PATCH body might include them (e.g.
    // resubmitting a previously-fetched row unchanged).
    const {
      id: _ignoreId, outletId: _ignoreOutlet, phone: _ignorePhone, riskScore: _ignoreScore, riskLevel: _ignoreLevel, riskCategory: _ignoreCategory,
      totalRentals: _ignoreTotal, lateReturnCount: _ignoreLate, noShowCount: _ignoreNoShow, cancellationCount: _ignoreCancel,
      damagedAssetCount: _ignoreDamaged, missingAssetCount: _ignoreMissing, outstandingAmount: _ignoreOutstanding,
      isBlacklisted: _ignoreBlacklist, blacklistReason: _ignoreReason, blacklistedBy: _ignoreBy, blacklistedAt: _ignoreAt,
      createdAt: _ignoreCreated, ...rest
    } = body;
    await db
      .update(homeRentalCustomerRisk)
      .set({ ...rest, updatedBy: session.sub, updatedAt: new Date().toISOString() })
      .where(eq(homeRentalCustomerRisk.id, id))
      .returning();
    // Identity/verification fields feed directly into the Customer Risk Score formula (identitas
    // lengkap, alamat terverifikasi, WA aktif, verificationStatus "flagged", deposit ditolak) —
    // rescore immediately so the badge shown right after Save always reflects what was just typed,
    // instead of only updating on the next booking/return event.
    const rescored = await recomputeCustomerRisk(existing.outletId, existing.phone, { updatedBy: session.sub });
    return NextResponse.json(rescored);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
