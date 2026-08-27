import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { orders, payments } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = body.reference_id || body.sid;

    if (!orderId) {
      return NextResponse.json({ success: false, error: "Invalid reference ID" }, { status: 400 });
    }

    const [order] = await db.select().from(orders).where(eq(orders.id, orderId));

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const [payment] = await db.select().from(payments).where(eq(payments.orderId, order.id));

    if (!payment) {
      return NextResponse.json({ success: false, error: "Payment record not found" }, { status: 404 });
    }

    const paidAmount = parseFloat(body.total || body.amount || 0);
    if (paidAmount !== order.total) {
      return NextResponse.json({ success: false, error: "Amount mismatch" }, { status: 400 });
    }

    const isSuccess = body.status_code === "1" || body.status === "berhasil";
    const newPaymentStatus = isSuccess ? "success" : "failed";
    const newOrderStatus = isSuccess ? "paid" : "open";

    // Gunakan transaksi database Drizzle secara aman
    await db.transaction(async (tx) => {
      await tx
        .update(payments)
        .set({
          status: newPaymentStatus,
          providerRef: body.trx_id?.toString() || payment.providerRef,
          paidAt: isSuccess ? new Date().toISOString() : null,
        })
        .where(eq(payments.id, payment.id));

      await tx
        .update(orders)
        .set({
          status: newOrderStatus,
        })
        .where(eq(orders.id, order.id));
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Webhook processing error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}