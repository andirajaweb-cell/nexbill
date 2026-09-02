import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { outletId, customerId, subtotal, discount, tax, total } = body;

    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [order] = await db.insert(orders).values({
      id: crypto.randomUUID(),
      outletId,
      customerId: customerId || "guest",
      subtotal: subtotal.toString(),
      discount: (discount || 0).toString(),
      tax: (tax || 0).toString(),
      total: total.toString(),
      status: "open",
    }).returning();

    return NextResponse.json({ success: true, orderId: order.id, orderNumber });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}