import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders, payments, rentalSessions, products } from "@/db/schema";
import { sql, eq } from "drizzle-orm";
import { describeError } from "@/lib/api/error";
import { getSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;

    const dateParam = req.nextUrl.searchParams.get("date");
    const start = dateParam ? new Date(dateParam) : new Date();
    start.setHours(0, 0, 0, 0);
    const startIso = start.toISOString();

    const paidOrdersToday = await db
      .select()
      .from(orders)
      .where(sql`${orders.outletId} = ${outletId} AND ${orders.status} = 'paid' AND ${orders.createdAt} >= ${startIso}`);

    const rentalToday = await db
      .select()
      .from(rentalSessions)
      .where(sql`${rentalSessions.outletId} = ${outletId} AND ${rentalSessions.status} = 'finished' AND ${rentalSessions.startedAt} >= ${startIso}`);

    const revenueFromOrders = paidOrdersToday.reduce((sum, o) => sum + o.total, 0);
    const revenueFromRental = rentalToday.reduce((sum, s) => sum + (s.totalAmount ?? 0), 0);

    // payments has no outletId of its own — scope it by joining back to orders, which
    // does, rather than trusting any client input.
    const paymentsToday = (
      await db
        .select({ method: payments.method, amount: payments.amount })
        .from(payments)
        .innerJoin(orders, eq(payments.orderId, orders.id))
        .where(sql`${orders.outletId} = ${outletId} AND ${payments.status} = 'success' AND ${payments.createdAt} >= ${startIso}`)
    );

    const byMethod: Record<string, number> = {};
    for (const p of paymentsToday) {
      byMethod[p.method] = (byMethod[p.method] ?? 0) + p.amount;
    }

    const lowStock = await db.select().from(products).where(sql`${products.outletId} = ${outletId} AND ${products.stockQty} <= ${products.lowStockThreshold}`);

    return NextResponse.json({
      date: startIso,
      totalRevenue: revenueFromOrders + revenueFromRental,
      revenueFromOrders,
      revenueFromRental,
      ordersCount: paidOrdersToday.length,
      rentalSessionsCount: rentalToday.length,
      revenueByPaymentMethod: byMethod,
      lowStockProducts: lowStock,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
