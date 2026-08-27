import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { loyaltyRewards } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const activeOnly = req.nextUrl.searchParams.get("activeOnly") === "true";
    const rows = await db.select().from(loyaltyRewards).where(eq(loyaltyRewards.outletId, session.outletId)).orderBy(asc(loyaltyRewards.sortOrder));
    return NextResponse.json(activeOnly ? rows.filter((r) => r.isActive) : rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola reward loyalty." }, { status: 403 });
    }
    const body = await req.json();
    if (!body.name || !body.type || !body.pointsCost) {
      return NextResponse.json({ error: "Nama, tipe, dan poin wajib diisi." }, { status: 400 });
    }
    if (body.type === "play_discount" && (!body.discountType || !body.discountValue)) {
      return NextResponse.json({ error: "Reward diskon main butuh tipe & nilai diskon." }, { status: 400 });
    }
    const { outletId: _ignoredOutlet, ...rest } = body;
    const [row] = await db.insert(loyaltyRewards).values({ ...rest, outletId: session.outletId }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
