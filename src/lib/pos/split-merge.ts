import { db } from "@/db/client";
import { orders, orderItems, rentalSessions } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

/** Throws if the order is tied to a rental session that's still running/paused — split/merge should only happen once the session has stopped and the bill is finalized. */
async function assertSessionNotActive(rentalSessionId: string | null) {
  if (!rentalSessionId) return;
  const [session] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, rentalSessionId)).limit(1);
  if (session && (session.status === "running" || session.status === "paused")) {
    throw new Error("Sesi rental untuk bill ini masih berjalan — hentikan sesi dulu sebelum split/merge.");
  }
}

/**
 * Split one bill evenly across N payers (e.g. a group of friends splitting
 * the rental cost). This splits the *amount*, not the physical items —
 * splitting individual F&B items N ways rarely makes sense for a receipt,
 * so each resulting order gets a single "Split bill" line for its share.
 */
export async function splitOrderEvenly(orderId: string, parts: number) {
  if (parts < 2) throw new Error("Split minimal 2 bagian.");
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.status !== "open") throw new Error("Order sudah dibayar/dibatalkan, tidak bisa displit.");
  await assertSessionNotActive(order.rentalSessionId);

  const splitGroupId = randomUUID();
  const baseShare = Math.floor(order.total / parts);
  const remainder = order.total - baseShare * parts;

  const newOrders = [];
  for (let i = 0; i < parts; i++) {
    const share = i === parts - 1 ? baseShare + remainder : baseShare; // remainder absorbed by the last share
    const [newOrder] = await db
      .insert(orders)
      .values({
        outletId: order.outletId,
        customerId: order.customerId,
        // Only the first split part keeps the rentalSessionId link — carrying it onto
        // every part would leave N simultaneously "open" orders pointing at the same
        // session, breaking getOpenBillForSession's "at most one open bill per session"
        // invariant used by mid-session F&B additions and the live billing board.
        rentalSessionId: i === 0 ? order.rentalSessionId : null,
        status: "open",
        subtotal: share,
        discount: 0,
        tax: 0,
        serviceCharge: 0,
        total: share,
        staffUserId: order.staffUserId,
        shiftId: order.shiftId,
        splitGroupId,
        source: order.source,
      })
      .returning();
    await db.insert(orderItems).values({
      orderId: newOrder.id,
      description: `Split bill ${i + 1}/${parts} dari order ${order.id.slice(0, 8)}`,
      qty: 1,
      unitPrice: share,
      lineTotal: share,
      itemType: "misc",
    });
    newOrders.push(newOrder);
  }

  await db.update(orders).set({ status: "cancelled", splitGroupId }).where(eq(orders.id, orderId));

  return newOrders;
}

/** Merge several open orders (e.g. two tables joining) into a single order carrying all their line items. */
export async function mergeOrders(orderIds: string[]) {
  if (orderIds.length < 2) throw new Error("Merge butuh minimal 2 order.");
  const sourceOrders = await db.select().from(orders).where(inArray(orders.id, orderIds));
  if (sourceOrders.some((o) => o.status !== "open")) throw new Error("Semua order yang di-merge harus berstatus open.");
  for (const o of sourceOrders) await assertSessionNotActive(o.rentalSessionId);

  const allItems = await db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));

  const subtotal = sourceOrders.reduce((s, o) => s + o.subtotal, 0);
  const discount = sourceOrders.reduce((s, o) => s + o.discount, 0);
  const tax = sourceOrders.reduce((s, o) => s + o.tax, 0);
  const serviceCharge = sourceOrders.reduce((s, o) => s + o.serviceCharge, 0);
  const total = sourceOrders.reduce((s, o) => s + o.total, 0);

  // Carry the rentalSessionId over only if exactly one source order was tied to a
  // session — a merged order can't represent two different sessions at once (single FK),
  // so ambiguous cases (two units' bills merged together) leave it unset rather than
  // silently keeping just one and losing traceability to the other.
  const distinctSessionIds = [...new Set(sourceOrders.map((o) => o.rentalSessionId).filter((id): id is string => !!id))];
  const rentalSessionId = distinctSessionIds.length === 1 ? distinctSessionIds[0] : null;

  const [merged] = await db
    .insert(orders)
    .values({
      outletId: sourceOrders[0].outletId,
      customerId: sourceOrders[0].customerId,
      rentalSessionId,
      status: "open",
      subtotal,
      discount,
      tax,
      serviceCharge,
      total,
      staffUserId: sourceOrders[0].staffUserId,
      shiftId: sourceOrders[0].shiftId,
      mergedFromOrderIds: JSON.stringify(orderIds),
      source: sourceOrders[0].source,
    })
    .returning();

  for (const item of allItems) {
    await db.insert(orderItems).values({
      orderId: merged.id,
      productId: item.productId,
      description: item.description,
      qty: item.qty,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      itemType: item.itemType,
      kitchenStatus: item.kitchenStatus,
    });
  }

  await db.update(orders).set({ status: "cancelled" }).where(inArray(orders.id, orderIds));

  return merged;
}
