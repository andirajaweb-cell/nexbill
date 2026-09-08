import { db } from "@/db/client";
import { orders, orderItems, payments, journalEntries, approvalRequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { voidJournal } from "@/lib/accounting/journal";
import { restockForItem } from "@/lib/inventory/stock";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit/log";

/**
 * Full refund of a paid or partially-paid bill: reverses every posted journal
 * for the order (sales + COGS, via voidJournal's reversal-by-new-entry — never
 * mutates posted history), restocks all non-cancelled items, marks every
 * successful payment "refunded", and cancels the order. This is a whole-order
 * refund (matches executeVoidOrder's scope) — partial/line-item refunds on an
 * already-paid bill aren't supported since the posted sales journal can't be
 * split after the fact without re-deriving per-account amounts; void the
 * specific item instead if the bill hasn't been paid yet.
 *
 * Atomic (Task #61): every journal reversal, every restock, and both status updates run inside
 * one `db.transaction()` — same reasoning as executeVoidOrder in void.ts: a refund is a
 * multi-part operation (reverse revenue, put stock back, mark payments refunded, cancel the
 * order) that must never be left half-applied by a crash partway through.
 */
export async function executeRefundOrder(orderId: string, reason: string, staffUserId?: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Order tidak ditemukan.");
    if (order.status === "cancelled") throw new Error("Order sudah dibatalkan/direfund.");
    if (order.status === "open" || order.status === "awaiting_payment") {
      throw new Error("Bill ini belum ada pembayaran yang berhasil — gunakan void, bukan refund.");
    }

    const relatedJournals = await tx.select().from(journalEntries).where(and(eq(journalEntries.sourceId, orderId), eq(journalEntries.status, "posted")));
    for (const j of relatedJournals) {
      await voidJournal(j.id, `Refund: ${reason}`, tx);
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    let itemsRestocked = 0;
    for (const item of items) {
      if (item.productId && item.kitchenStatus !== "cancelled") {
        await restockForItem(item.productId, item.qty, orderId, "Refund order", tx);
        itemsRestocked++;
      }
    }

    const successPayments = await tx.select().from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "success")));
    await tx.update(payments).set({ status: "refunded" }).where(eq(payments.orderId, orderId));

    await tx.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));

    await logAudit({ outletId: order.outletId, staffUserId, action: "refund_order", entityType: "order", entityId: orderId, after: { reason } });

    return { orderId, journalsVoided: relatedJournals.length, itemsRestocked, paymentsRefunded: successPayments.length, amountRefunded: successPayments.reduce((s, p) => s + p.amount, 0) };
  });
}

/** Same approval-gate pattern as void: refund_order permission lets owner/manager execute immediately, everyone else needs approval. */
export async function requestRefundOrder(orderId: string, staffUserId: string, role: StaffRole, reason: string) {
  if (hasPermission(role, "refund_order")) {
    return { pending: false, result: await executeRefundOrder(orderId, reason, staffUserId) };
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");

  const [request] = await db
    .insert(approvalRequests)
    .values({ outletId: order.outletId, type: "refund", refType: "order", refId: orderId, requestedBy: staffUserId, reason })
    .returning();

  await logAudit({ outletId: order.outletId, staffUserId, action: "request_refund", entityType: "order", entityId: orderId, after: { reason } });

  return { pending: true, request };
}
