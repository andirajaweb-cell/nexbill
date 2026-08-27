import { db } from "@/db/client";
import { orderItems, orders, rentalSessions, rentalUnits, customers } from "@/db/schema";
import { eq, inArray, and, sql } from "drizzle-orm";
import { deductStockForItem, restockForItem } from "@/lib/inventory/stock";
import { recomputeBillTotals } from "@/lib/pos/bill";
import { logAudit } from "@/lib/audit/log";

const ACTIVE_KITCHEN_STATUSES = ["new", "confirmed", "preparing", "ready"] as const;
const NEXT_STATUS: Record<string, string> = { new: "confirmed", confirmed: "preparing", preparing: "ready", ready: "served" };

export interface KitchenQueueRow {
  itemId: string;
  orderId: string;
  description: string;
  qty: number;
  kitchenStatus: string;
  createdAt: string;
  unitName: string | null;
  customerLabel: string;
}

/** Everything the kitchen still needs to act on, across every open bill in the outlet — grouped by bill in the UI, oldest first. */
export async function getKitchenQueue(outletId: string): Promise<KitchenQueueRow[]> {
  const rows = await db
    .select({
      itemId: orderItems.id,
      orderId: orderItems.orderId,
      description: orderItems.description,
      qty: orderItems.qty,
      kitchenStatus: orderItems.kitchenStatus,
      createdAt: orderItems.createdAt,
      orderCustomerId: orders.customerId,
      rentalSessionId: orders.rentalSessionId,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.outletId, outletId), inArray(orderItems.kitchenStatus, [...ACTIVE_KITCHEN_STATUSES])))
    .orderBy(orderItems.createdAt);

  const sessionIds = Array.from(new Set(rows.map((r) => r.rentalSessionId).filter((x): x is string => !!x)));
  const customerIds = Array.from(new Set(rows.map((r) => r.orderCustomerId).filter((x): x is string => !!x)));

  const sessions = sessionIds.length
    ? await db.select({ id: rentalSessions.id, customerName: rentalSessions.customerName, rentalUnitId: rentalSessions.rentalUnitId }).from(rentalSessions).where(inArray(rentalSessions.id, sessionIds))
    : [];
  const unitIds = Array.from(new Set(sessions.map((s) => s.rentalUnitId)));
  const units = unitIds.length ? await db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(inArray(rentalUnits.id, unitIds)) : [];
  const unitNameById = new Map(units.map((u) => [u.id, u.name]));
  const sessionById = new Map(sessions.map((s) => [s.id, s]));

  const customerRows = customerIds.length ? await db.select({ id: customers.id, name: customers.name }).from(customers).where(inArray(customers.id, customerIds)) : [];
  const customerNameById = new Map(customerRows.map((c) => [c.id, c.name]));

  return rows.map((r) => {
    const session = r.rentalSessionId ? sessionById.get(r.rentalSessionId) : undefined;
    const unitName = session ? unitNameById.get(session.rentalUnitId) ?? null : null;
    const customerLabel = session?.customerName || (r.orderCustomerId ? customerNameById.get(r.orderCustomerId) ?? "-" : "Walk-in");
    return {
      itemId: r.itemId,
      orderId: r.orderId,
      description: r.description,
      qty: r.qty,
      kitchenStatus: r.kitchenStatus,
      createdAt: r.createdAt,
      unitName,
      customerLabel,
    };
  });
}

/** Advance an item to the next kitchen stage (new -> confirmed -> preparing -> ready -> served). */
export async function advanceItemStatus(itemId: string, staffUserId?: string) {
  const [item] = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
  if (!item) throw new Error("Item tidak ditemukan.");
  const next = NEXT_STATUS[item.kitchenStatus];
  if (!next) throw new Error(`Item berstatus "${item.kitchenStatus}" tidak bisa dilanjutkan.`);

  const [updated] = await db.update(orderItems).set({ kitchenStatus: next as any }).where(eq(orderItems.id, itemId)).returning();
  await logAudit({ staffUserId, action: "advance_kitchen_status", entityType: "order_item", entityId: itemId, after: { from: item.kitchenStatus, to: next } });
  return updated;
}

/**
 * Cancel an unprepared kitchen item (e.g. out of stock) — restocks
 * immediately since nothing was consumed, and recomputes the bill total.
 * This is a lightweight kitchen-side cancel, distinct from voiding an
 * already-served/paid item, which goes through the heavier approval-backed
 * void flow in src/lib/pos/void.ts.
 */
export async function cancelKitchenItem(itemId: string, reason: string, staffUserId?: string) {
  const [item] = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
  if (!item) throw new Error("Item tidak ditemukan.");
  if (item.kitchenStatus === "served") throw new Error("Item sudah disajikan — gunakan void item di POS, bukan batal dapur.");
  if (item.kitchenStatus === "cancelled") throw new Error("Item sudah dibatalkan.");

  await db.update(orderItems).set({ kitchenStatus: "cancelled", cancelReason: reason }).where(eq(orderItems.id, itemId));

  if (item.productId) {
    await restockForItem(item.productId, item.qty, item.orderId, `Batal dapur: ${reason}`);
  }

  await recomputeBillTotals(item.orderId);
  await logAudit({ staffUserId, action: "cancel_kitchen_item", entityType: "order_item", entityId: itemId, after: { reason } });

  return { itemId, cancelled: true };
}
