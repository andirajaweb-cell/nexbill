import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, payments } from "@/db/schema";
import { IpaymuProvider } from "@/lib/payment/ipaymu";
import { eq } from "drizzle-orm";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const { paymentMethod, customerName, customerEmail, customerPhone } = body;

    // Ambil order berdasarkan ID
    const orderList = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = orderList[0];

    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    if (order.status === "paid") {
      return NextResponse.json({ success: false, error: "Order is already paid" }, { status: 400 });
    }

    // Cek pembayaran yang sudah ada
    const paymentList = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, order.id))
      .limit(1);
    
    const existingPayment = paymentList[0];

    const ipaymu = new IpaymuProvider();
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const ipaymuResponse = await ipaymu.createTransaction({
      orderId: order.id,
      amount: order.total,
      buyerName: customerName || "Customer",
      buyerEmail: customerEmail || "customer@example.com",
      buyerPhone: customerPhone || "08123456789",
      paymentMethod: paymentMethod || "qris",
      returnUrl: `${baseUrl}/payment/${order.id}/success`,
      notifyUrl: `${baseUrl}/api/payments/ipaymu/webhook`,
    });

    if (!existingPayment) {
      await db.insert(payments).values({
        orderId: order.id,
        method: paymentMethod || "qris",
        amount: order.total,
        status: "pending",
        providerRef: ipaymuResponse.transactionId?.toString() || ipaymuResponse.referenceId,
        qrString: ipaymuResponse.qrString,
        qrImageUrl: ipaymuResponse.qrImage,
      });
    } else {
      await db
        .update(payments)
        .set({
          method: paymentMethod || existingPayment.method,
          providerRef: ipaymuResponse.transactionId?.toString() || ipaymuResponse.referenceId,
          qrImageUrl: ipaymuResponse.qrImage,
        })
        .where(eq(payments.id, existingPayment.id));
    }

    return NextResponse.json({
      success: true,
      paymentUrl: ipaymuResponse.url,
      qrImage: ipaymuResponse.qrImage,
      vaNumber: ipaymuResponse.va || ipaymuResponse.paymentNo,
    });
  } catch (error: unknown) {
    console.error("Payment init error:", error);
    const message = error instanceof Error ? error.message : "Payment initialization failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}