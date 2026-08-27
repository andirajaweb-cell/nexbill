import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { membershipTiers } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

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
    const body = await req.json();
    const { outletId: _ignoredOutlet, ...rest } = body;
    const [row] = await db.insert(membershipTiers).values({ ...rest, outletId: session.outletId }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
