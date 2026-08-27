import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalAssets, homeRentalRentalAssets, homeRentalRentals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { recomputeCustomerRisk } from "@/lib/home-rental/risk";

// While an asset is out with a customer ("rented_out"), the only direct status changes allowed
// are the two loss/damage incidents that can genuinely be discovered mid-rental (a customer
// reports it broken, or it can't be located) — everything else (back to available, sent to
// repair, retired) still has to go through the normal Return flow first.
const ALLOWED_FROM_RENTED_OUT = new Set(["rented_out", "damaged", "missing"]);

/** Edit an asset's details, condition, location, status (e.g. manually mark repair/retired/missing), or soft-delete (isActive: false). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const [existing] = await db.select().from(homeRentalAssets).where(eq(homeRentalAssets.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Aset tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    if (existing.status === "rented_out" && body.status && !ALLOWED_FROM_RENTED_OUT.has(body.status)) {
      return NextResponse.json({ error: "Aset sedang disewa — proses Return dulu, atau tandai rusak/hilang jika insiden terjadi saat masih di tangan pelanggan." }, { status: 400 });
    }
    const { id: _ignoreId, outletId: _ignoreOutlet, productId: _ignoreProduct, createdAt: _ignoreCreated, ...rest } = body;
    const [row] = await db.update(homeRentalAssets).set(rest).where(eq(homeRentalAssets.id, id)).returning();

    // Freshly marked damaged/missing while still out with a customer — recompute that
    // customer's risk profile right away so Risk Control reflects the incident immediately
    // instead of waiting for their next return/booking event.
    if (existing.status === "rented_out" && (row.status === "damaged" || row.status === "missing")) {
      const [link] = await db
        .select()
        .from(homeRentalRentalAssets)
        .where(eq(homeRentalRentalAssets.assetId, id))
        .orderBy(desc(homeRentalRentalAssets.scannedOutAt))
        .limit(1);
      if (link) {
        const [rental] = await db.select().from(homeRentalRentals).where(eq(homeRentalRentals.id, link.rentalId)).limit(1);
        if (rental?.phone) {
          await recomputeCustomerRisk(rental.outletId, rental.phone, { customerId: rental.customerId, customerName: rental.customerName, updatedBy: session.sub });
        }
      }
    }

    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
