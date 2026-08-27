import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { customers } from "@/db/schema";
import { desc, like, or, and, eq, isNull } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { generateMemberNumber } from "@/lib/customers/member-number";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const search = req.nextUrl.searchParams.get("search");
    // outletId is nullable on this table (legacy rows) — include those alongside the caller's
    // own outlet so pre-existing customer data doesn't silently vanish, but never any other
    // tenant's rows.
    const scope = or(eq(customers.outletId, session.outletId), isNull(customers.outletId));
    const rows = search
      ? await db.select().from(customers).where(and(scope, or(like(customers.name, `%${search}%`), like(customers.phone, `%${search}%`), like(customers.memberNumber, `%${search}%`)))).orderBy(desc(customers.createdAt))
      : await db.select().from(customers).where(scope).orderBy(desc(customers.createdAt));
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
    // memberNumber is always server-generated and permanent — never accept a client-supplied
    // value here, even if one is present in the request body. outletId always comes from the
    // session too, never the client.
    const { memberNumber: _ignored, outletId: _ignoredOutlet, ...rest } = body;
    const memberNumber = await generateMemberNumber();
    const [row] = await db.insert(customers).values({ ...rest, outletId: session.outletId, memberNumber }).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
