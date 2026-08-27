import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalRentals, outlets, homeRentalProducts, homeRentalPackages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * A customer's own Home Rental transaction history, cross-outlet — same "fraud data bank" scope
 * as /api/home-rental/risk (see that route's doc comment): once staff has searched for and is
 * looking at one customer's risk profile, they can also see that customer's actual transaction
 * record (which outlet, when, on-time or late, checklist/rating result at return) across every
 * outlet, not just this one — that's the point of a shared risk bank. Still search-gated the same
 * way: `phone` is REQUIRED, no phone = empty array, so this can never be used to browse. Returns
 * only the fields relevant to a risk assessment (not full commercial detail like delivery address,
 * payment method, or journal references) — capped to `limit` (20/30/50 from the UI), most recent
 * first.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const phone = (req.nextUrl.searchParams.get("phone") ?? "").trim();
    if (!phone) return NextResponse.json([]);
    let limit = Number(req.nextUrl.searchParams.get("limit")) || 20;
    limit = Math.min(100, Math.max(1, limit));

    const rows = await db
      .select({
        id: homeRentalRentals.id,
        rentalCode: homeRentalRentals.rentalCode,
        outletId: homeRentalRentals.outletId,
        outletName: outlets.name,
        productName: homeRentalProducts.name,
        packageName: homeRentalPackages.name,
        scheduledStart: homeRentalRentals.scheduledStart,
        scheduledEnd: homeRentalRentals.scheduledEnd,
        returnedAt: homeRentalRentals.returnedAt,
        status: homeRentalRentals.status,
        approvalStatus: homeRentalRentals.approvalStatus,
        totalAmount: homeRentalRentals.totalAmount,
        lateFee: homeRentalRentals.lateFee,
        returnChecklistOk: homeRentalRentals.returnChecklistOk,
        returnRating: homeRentalRentals.returnRating,
        returnRatingNote: homeRentalRentals.returnRatingNote,
        createdAt: homeRentalRentals.createdAt,
      })
      .from(homeRentalRentals)
      .leftJoin(outlets, eq(homeRentalRentals.outletId, outlets.id))
      .leftJoin(homeRentalProducts, eq(homeRentalRentals.productId, homeRentalProducts.id))
      .leftJoin(homeRentalPackages, eq(homeRentalRentals.packageId, homeRentalPackages.id))
      .where(eq(homeRentalRentals.phone, phone))
      .orderBy(desc(homeRentalRentals.createdAt))
      .limit(limit);

    const out = rows.map((r) => ({
      ...r,
      outletName: r.outletName ?? "—",
      isOwnOutlet: r.outletId === session.outletId,
      itemName: r.packageName ?? r.productName ?? "—",
    }));
    return NextResponse.json(out);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
