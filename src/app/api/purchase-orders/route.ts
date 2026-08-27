import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { purchaseOrders, purchaseOrderItems } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { createPurchaseOrder } from "@/lib/inventory/purchasing";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const pos = await db.select().from(purchaseOrders).where(eq(purchaseOrders.outletId, session.outletId)).orderBy(desc(purchaseOrders.orderDate));
    const result = await Promise.all(
      pos.map(async (po) => ({ ...po, items: await db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, po.id)) }))
    );
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
