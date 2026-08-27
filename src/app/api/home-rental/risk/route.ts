import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalCustomerRisk, outlets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { recomputeCustomerRisk } from "@/lib/home-rental/risk";

/**
 * Look up customer risk profiles — deliberately NOT scoped to session.outletId (shared fraud/risk
 * data bank across every outlet on the platform), but ALSO deliberately NOT a browsable list: a
 * search query (`q`, or `phone` for an exact lookup) is REQUIRED, and with no query this returns
 * an empty array rather than dumping every customer's KTP/photos/address across Indonesia. This
 * is a privacy requirement, not just a UX choice — staff should only ever see the ONE customer
 * they're actually checking, not everyone's data at once. An exact phone match returns just that
 * row; a partial name/KTP query returns a small capped set of possible matches to pick from.
 * Mutations (POST/PATCH) stay scoped to the caller's own outlet; only reads are cross-tenant here.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const q = (req.nextUrl.searchParams.get("q") ?? req.nextUrl.searchParams.get("phone") ?? "").trim();
    const riskCategory = req.nextUrl.searchParams.get("riskCategory");
    if (!q) return NextResponse.json([]);

    const rows = await db
      .select({ risk: homeRentalCustomerRisk, outletName: outlets.name })
      .from(homeRentalCustomerRisk)
      .leftJoin(outlets, eq(homeRentalCustomerRisk.outletId, outlets.id))
      .orderBy(desc(homeRentalCustomerRisk.riskScore));
    let out = rows.map((r) => ({ ...r.risk, outletName: r.outletName ?? "—", isOwnOutlet: r.risk.outletId === session.outletId }));

    const exactPhone = out.find((r) => r.phone === q);
    if (exactPhone) {
      out = [exactPhone];
    } else {
      const qLower = q.toLowerCase();
      out = out
        .filter((r) => (r.phone ?? "").toLowerCase().includes(qLower) || (r.customerName ?? "").toLowerCase().includes(qLower) || (r.identityNumber ?? "").toLowerCase().includes(qLower))
        .slice(0, 8);
    }
    if (riskCategory) out = out.filter((r) => r.riskCategory === riskCategory);
    return NextResponse.json(out);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Force-recompute a phone's risk profile on demand (e.g. "Cek Risiko" button before confirming a booking) — creates the row if it doesn't exist yet. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.phone) return NextResponse.json({ error: "Nomor telepon wajib diisi." }, { status: 400 });
    const row = await recomputeCustomerRisk(session.outletId, body.phone, {
      customerId: body.customerId,
      customerName: body.customerName,
      identityType: body.identityType,
      identityNumber: body.identityNumber,
      address: body.address,
      idPhotoUrl: body.idPhotoUrl,
      selfieWithIdUrl: body.selfieWithIdUrl,
      waVerified: body.waVerified,
      addressVerified: body.addressVerified,
      depositRefused: body.depositRefused,
      verificationStatus: body.verificationStatus,
      emergencyContactName: body.emergencyContactName,
      emergencyContactPhone: body.emergencyContactPhone,
      updatedBy: session.sub,
    });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
