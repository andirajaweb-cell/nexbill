import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { purchaseOrders, purchaseOrderItems } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { createPurchaseOrder } from "@/lib/inventory/purchasing";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Unbounded before — an outlet's full PO history, growing forever, on every load of the
    // Purchase Order tab. 300 gives comfortable headroom over what's actually displayed.
    const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.outletId, session.outletId)).orderBy(desc(purchaseOrders.orderDate)).limit(300);
    // Was one items query per PO inside Promise.all — parallel, so not blocking, but still N
    // round trips for N POs. One inArray query covers every PO's items in a single round trip.
    const poIds = pos.map((po) => po.id);
    const items = poIds.length ? await db.select().from(purchaseOrderItems).where(inArray(purchaseOrderItems.purchaseOrderId, poIds)) : [];
    const itemsByPoId = new Map<string, typeof items>();
    for (const it of items) {
      const list = itemsByPoId.get(it.purchaseOrderId) ?? [];
      list.push(it);
      itemsByPoId.set(it.purchaseOrderId, list);
    }
    const result = pos.map((po) => ({ ...po, items: itemsByPoId.get(po.id) ?? [] }));
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json();
    return NextResponse.json(await createPurchaseOrder({ ...body, outletId: session.outletId }));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
