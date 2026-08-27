import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { stockOpnames, stockOpnameItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createStockOpname } from "@/lib/inventory/stock-opname";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db.select().from(stockOpnames).where(eq(stockOpnames.outletId, session.outletId)).orderBy(desc(stockOpnames.opnameDate));
    const result = await Promise.all(
      rows.map(async (o) => ({ ...o, items: await db.select().from(stockOpnameItems).where(eq(stockOpnameItems.stockOpnameId, o.id)) }))
    );
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const body = await req.json();
  return NextResponse.json(await createStockOpname({ ...body, outletId: session.outletId }));
}
