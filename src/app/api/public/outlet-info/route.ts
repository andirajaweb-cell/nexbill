import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { resolveOutletDisplayName } from "@/lib/outlets/membership";

/**
 * Public, unauthenticated slim outlet lookup for the customer-facing booking
 * page (/book/[slug]) — deliberately whitelists only fields safe to expose to
 * anonymous visitors. `/api/outlets/default` returns the FULL row (including
 * wifiPassword and internal approval thresholds), so that endpoint must
 * never be reused here.
 *
 * Requires `?slug=` and resolves strictly by it — every outlet on the platform gets its own
 * /book/[slug] link (see lib/outlets/slug.ts), so there is no "default"/fallback outlet here.
 * A previous version of this route fell back to a staff-session cookie, then to "the first
 * outlet row in the database" when that cookie was absent — which meant every visitor to the
 * old single global /book page saw the same one arbitrary outlet's data regardless of which
 * merchant's link they'd actually clicked. Do not reintroduce that fallback.
 */
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Link booking tidak valid." }, { status: 400 });

    const [row] = await db.select().from(outlets).where(eq(outlets.slug, slug)).limit(1);
    if (!row) return NextResponse.json({ error: "Outlet tidak ditemukan. Periksa kembali link booking-nya." }, { status: 404 });

    return NextResponse.json({
      id: row.id,
      // "Business Name + Nama Cabang" — see resolveOutletDisplayName() for why this outlet's
      // raw `name` alone can be a bare branch label with no business-name context.
      name: await resolveOutletDisplayName(row.id),
      address: row.address,
      phone: row.phone,
      logoUrl: row.logoUrl,
      acceptOnlineBooking: row.acceptOnlineBooking,
      bookingMinLeadMinutes: row.bookingMinLeadMinutes,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
