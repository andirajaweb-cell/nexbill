import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { membershipTiers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { forbidUnless } from "@/lib/auth/require-permission";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(membershipTiers).where(eq(membershipTiers.outletId, session.outletId)).orderBy(asc(membershipTiers.sortOrder));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const denied = forbidUnless(session, ["manage_pricing_promo"], "Role kamu tidak punya izin membuat membership tier.");
    if (denied) return denied;
    const body = await req.json();
    // Kolom sistem tidak boleh diisi dari body (id, waktu dibuat, outlet).
    const { outletId: _ignoredOutlet, id: _id, createdAt: _c, updatedAt: _u, ...rest } = body;
    const [row] = await db.insert(membershipTiers).values({ ...rest, outletId: session.outletId }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
