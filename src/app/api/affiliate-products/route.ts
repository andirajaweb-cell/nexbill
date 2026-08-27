import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { affiliateProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Read-only feed for the "Rekomendasi Produk" showcase page — just requires a logged-in staff
 * session (any role, any outlet), no outletId scoping at all, since this catalog is a single
 * platform-wide list curated by Digitrajasa via /platform-admin/affiliate, not per-outlet data.
 * Only active rows are returned; inactive ones stay hidden from outlets but visible in the
 * platform-admin list so they can be reactivated later instead of re-typed.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(affiliateProducts).where(eq(affiliateProducts.isActive, true));
    return NextResponse.json(rows.sort((a, b) => a.sortOrder - b.sortOrder));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
