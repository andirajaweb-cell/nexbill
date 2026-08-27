import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { mergeOrders } from "@/lib/pos/split-merge";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const { orderIds } = await req.json();
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ error: "orderIds wajib diisi." }, { status: 400 });
    }
    // Every order being merged must belong to the caller's own outlet — otherwise this could
    // splice a foreign tenant's order/items into one of the caller's bills.
    const rows = await db.select({ id: orders.id, outletId: orders.outletId }).from(orders).where(inArray(orders.id, orderIds));
    if (rows.length !== orderIds.length || rows.some((r) => r.outletId !== session.outletId)) {
      return NextResponse.json({ error: "Salah satu order tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json(await mergeOrders(orderIds));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
