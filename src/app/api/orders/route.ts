import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders, orderItems, outlets, rentalSessions } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { validateVoucher, consumeVoucher } from "@/lib/pos/vouchers";
import { getOpenBillForSession, addItemsToBill } from "@/lib/pos/bill";
import { deductStockForItem } from "@/lib/inventory/stock";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const status = req.nextUrl.searchParams.get("status");
    // "open" orders are naturally bounded (only ever a handful in flight at once), but a status
    // like "paid" with no date filter grows with the outlet's entire order history — without a
    // limit this becomes a full-table scan (and a multi-MB response) as the outlet ages. Callers
    // that want more than the default can pass ?limit=, capped so no one can accidentally request
    // the whole table.
    const requestedLimit = Number(req.nextUrl.searchParams.get("limit"));
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 500) : 200;
    const rows = status
      ? await db.select().from(orders).where(and(eq(orders.outletId, session.outletId), eq(orders.status, status as any))).orderBy(desc(orders.createdAt)).limit(limit)
      : await db.select().from(orders).where(eq(orders.outletId, session.outletId)).orderBy(desc(orders.createdAt)).limit(limit);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

interface IncomingItem {
  productId?: string;
  description: string;
  qty: number;
  unitPrice: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const {
      customerId,
      rentalSessionId,
      items,
      discount = 0,
      voucherCode,
      applyTax = false,
      applyServiceCharge = false,
      source = "pos",
      staffUserId,
      shiftId,
    } = await req.json();
    // outletId always comes from the session, never the request body — this used to trust
    // whatever outletId the client sent, letting a logged-in staffer at one outlet create
    // orders (and consume vouchers, deduct stock) against any other tenant's data.
    const outletId = session.outletId;

    const lineItems = (items as IncomingItem[]).map((i) => ({ ...i, lineTotal: i.qty * i.unitPrice }));

    // If this order belongs to a rental session that already has an open
    // unified bill (the normal case since sessions open their bill at start),
    // append the F&B items to that SAME bill instead of creating a new
    // invoice — this is the core of "unified open bill": one bill per
    // session, added to any time, no matter how many rounds of F&B.
    if (rentalSessionId) {
      const [owningSession] = await db.select({ outletId: rentalSessions.outletId }).from(rentalSessions).where(eq(rentalSessions.id, rentalSessionId)).limit(1);
      if (!owningSession || owningSession.outletId !== outletId) {
        return NextResponse.json({ error: "Sesi rental tidak ditemukan." }, { status: 404 });
      }
      const bill = await getOpenBillForSession(rentalSessionId);
      if (bill) {
        const updated = await addItemsToBill(
          bill.id,
          lineItems.map((i) => ({ productId: i.productId, description: i.description, qty: i.qty, unitPrice: i.unitPrice })),
          staffUserId
        );
        return NextResponse.json(updated);
      }
    }

    // Standalone order — walk-in POS sale with no active rental session (or
    // a session whose bill somehow isn't open, e.g. already paid/cancelled).
    const subtotal = lineItems.reduce((sum, i) => sum + i.lineTotal, 0);

    let voucherId: string | undefined;
    let voucherDiscount = 0;
    if (voucherCode) {
      const validation = await validateVoucher(outletId, voucherCode, subtotal, customerId);
      if (!validation.valid) return NextResponse.json({ error: validation.reason }, { status: 400 });
      voucherId = validation.voucher!.id;
      voucherDiscount = validation.discountAmount;
    }

    const totalDiscount = discount + voucherDiscount;
    const [outlet] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    const taxableBase = Math.max(0, subtotal - totalDiscount);
    const tax = applyTax ? Math.round((taxableBase * (outlet?.taxPercent ?? 0)) / 100) : 0;
    const serviceCharge = applyServiceCharge ? Math.round((taxableBase * (outlet?.serviceChargePercent ?? 0)) / 100) : 0;
    const total = Math.max(0, taxableBase + tax + serviceCharge);

    const [order] = await db
      .insert(orders)
      .values({
        outletId,
        customerId,
        rentalSessionId,
        subtotal,
        discount: totalDiscount,
        tax,
        serviceCharge,
        applyTax,
        applyServiceCharge,
        total,
        voucherId,
        source,
        staffUserId,
        shiftId,
        status: "open",
      })
      .returning();

    for (const item of lineItems) {
      await db.insert(orderItems).values({ orderId: order.id, ...item, itemType: "product" });
      if (item.productId) {
        await deductStockForItem(item.productId, item.qty, order.id, staffUserId);
      }
    }

    if (voucherId) await consumeVoucher(voucherId);

    return NextResponse.json(order);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
