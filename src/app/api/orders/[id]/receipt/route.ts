import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { orderItems, payments, outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireOwnedOrder } from "@/lib/pos/order-guard";
import { describeError, errorStatus } from "@/lib/api/error";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { order } = await requireOwnedOrder(id);

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const paymentRows = await db.select().from(payments).where(eq(payments.orderId, id));
    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, order.outletId)).limit(1);

    return NextResponse.json({ order, items, payments: paymentRows, outlet });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}
