import { db } from "@/db/client";
import { orders, orderItems, payments, journalEntries, journalLines, approvalRequests, staffUsers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { voidJournal } from "@/lib/accounting/journal";
import { restockForItem } from "@/lib/inventory/stock";
import { recomputeBillTotals } from "@/lib/pos/bill";
import { executeRefundOrder } from "@/lib/pos/refund";
import { hasPermission, StaffRole, canApproveForRole, roleLabel } from "@/lib/auth/permissions";
import { logAudit } from "@/lib/audit/log";

/**
 * Shared by approveRequest/rejectRequest: an approval-hierarchy check on top of the
 * approve_requests permission gate — the reviewer must be strictly more senior (lower
 * ROLE_LEVEL) than whoever filed the request, per the 6-tier level structure in permissions.ts.
 * A request with no requestedBy (shouldn't normally happen) skips the check rather than block.
 */
async function assertCanReviewRequest(request: typeof approvalRequests.$inferSelect, reviewerRole: StaffRole) {
  if (!request.requestedBy) return;
  const [requester] = await db.select({ role: staffUsers.role }).from(staffUsers).where(eq(staffUsers.id, request.requestedBy)).limit(1);
  if (!requester) return;
  if (!canApproveForRole(reviewerRole, requester.role as StaffRole)) {
    throw new Error(`Role kamu (${roleLabel(reviewerRole)}) tidak bisa menyetujui/menolak permintaan dari role yang levelnya setara atau lebih tinggi (${roleLabel(requester.role as StaffRole)}).`);
  }
}

/** Actually void a paid order: reverses its accounting journal(s), restocks items, marks payment refunded. */
export async function executeVoidOrder(orderId: string, reason: string, staffUserId?: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.status === "cancelled") throw new Error("Order sudah dibatalkan.");

  const relatedJournals = await db.select().from(journalEntries).where(and(eq(journalEntries.sourceId, orderId), eq(journalEntries.status, "posted")));
  for (const j of relatedJournals) {
    await voidJournal(j.id, reason);
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (item.productId && item.kitchenStatus !== "cancelled") await restockForItem(item.productId, item.qty, orderId, "Void order");
  }

  await db.update(orders).set({ status: "cancelled" }).where(eq(orders.id, orderId));
  await db.update(payments).set({ status: "refunded" }).where(eq(payments.orderId, orderId));

  await logAudit({ outletId: order.outletId, staffUserId, action: "void_order", entityType: "order", entityId: orderId, after: { reason } });

  return { orderId, journalsVoided: relatedJournals.length, itemsRestocked: items.length };
}

/**
 * Genuinely deletes a transaction — not a void (which keeps the order row with
 * status="cancelled" plus a reversing journal entry for audit trail). This
 * removes the order, its items, payments, and journal entries entirely.
 * Reserved for Owner only (enforced in the API route, not here) since it
 * erases history that void/refund deliberately preserve.
 *
 * Still restocks inventory (unless the order was already void/cancelled,
 * in which case that already happened once and doing it again would
 * double-count stock) so deleting a mistaken sale doesn't leave stock
 * permanently short.
 */
export async function hardDeleteOrder(orderId: string, staffUserId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");

  if (order.status !== "cancelled") {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.productId && item.kitchenStatus !== "cancelled") await restockForItem(item.productId, item.qty, orderId, "Hapus transaksi (Owner)");
    }
  }

  const relatedJournals = await db.select().from(journalEntries).where(eq(journalEntries.sourceId, orderId));
  for (const j of relatedJournals) {
    await db.delete(journalLines).where(eq(journalLines.journalEntryId, j.id));
  }
  if (relatedJournals.length) {
    await db.delete(journalEntries).where(eq(journalEntries.sourceId, orderId));
  }

  await db.delete(payments).where(eq(payments.orderId, orderId));
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
  await db.delete(orders).where(eq(orders.id, orderId));

  await logAudit({ outletId: order.outletId, staffUserId, action: "delete_order", entityType: "order", entityId: orderId, before: order });

  return { orderId, journalsDeleted: relatedJournals.length };
}

/**
 * Void a single line item on a bill (e.g. a wrong F&B order) without touching the
 * rest of the bill — restocks the item and recomputes the order's totals. Only
 * valid before the bill is fully paid (use executeRefundOrder for a paid bill).
 */
export async function executeVoidItem(orderItemId: string, reason: string, staffUserId?: string) {
  const [item] = await db.select().from(orderItems).where(eq(orderItems.id, orderItemId)).limit(1);
  if (!item) throw new Error("Item tidak ditemukan.");
  if (item.kitchenStatus === "cancelled") throw new Error("Item sudah dibatalkan.");

  const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");
  if (order.status === "paid") throw new Error("Bill sudah lunas — gunakan refund, bukan void item.");
  if (order.status === "cancelled") throw new Error("Order sudah dibatalkan.");
  if (item.itemType === "rental") throw new Error("Item biaya rental tidak bisa di-void sendiri — void seluruh order jika perlu.");

  if (item.productId) await restockForItem(item.productId, item.qty, item.orderId, "Void item");

  await db
    .update(orderItems)
    .set({ kitchenStatus: "cancelled", cancelReason: reason, voidedBy: staffUserId, voidedAt: new Date().toISOString() })
    .where(eq(orderItems.id, orderItemId));

  const updatedOrder = await recomputeBillTotals(item.orderId);

  await logAudit({ outletId: order.outletId, staffUserId, action: "void_item", entityType: "order_item", entityId: orderItemId, after: { reason } });

  return { orderItemId, order: updatedOrder };
}

/**
 * Void requires approval unless the requester's role has `void_order_direct`.
 * Cashiers always go through approval — this is the RBAC/approval-workflow
 * enforcement point (see permissions.ts caveat: not yet backed by real auth).
 */
export async function requestVoidOrder(orderId: string, staffUserId: string, role: StaffRole, reason: string) {
  if (hasPermission(role, "void_order_direct")) {
    return { pending: false, result: await executeVoidOrder(orderId, reason, staffUserId) };
  }

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");

  const [request] = await db
    .insert(approvalRequests)
    .values({ outletId: order.outletId, type: "void_order", refType: "order", refId: orderId, requestedBy: staffUserId, reason })
    .returning();

  await logAudit({ outletId: order.outletId, staffUserId, action: "request_void", entityType: "order", entityId: orderId, after: { reason } });

  return { pending: true, request };
}

/** Same approval gate as requestVoidOrder, at item granularity. */
export async function requestVoidItem(orderItemId: string, staffUserId: string, role: StaffRole, reason: string) {
  if (hasPermission(role, "void_order_direct")) {
    return { pending: false, result: await executeVoidItem(orderItemId, reason, staffUserId) };
  }

  const [item] = await db.select().from(orderItems).where(eq(orderItems.id, orderItemId)).limit(1);
  if (!item) throw new Error("Item tidak ditemukan.");
  const [order] = await db.select().from(orders).where(eq(orders.id, item.orderId)).limit(1);
  if (!order) throw new Error("Order tidak ditemukan.");

  const [request] = await db
    .insert(approvalRequests)
    .values({ outletId: order.outletId, type: "void_item", refType: "order_item", refId: orderItemId, requestedBy: staffUserId, reason })
    .returning();

  await logAudit({ outletId: order.outletId, staffUserId, action: "request_void_item", entityType: "order_item", entityId: orderItemId, after: { reason } });

  return { pending: true, request };
}

export async function approveRequest(requestId: string, reviewerId: string, reviewerRole: StaffRole, note?: string) {
  const [request] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Permintaan tidak ditemukan.");
  if (request.status !== "pending") throw new Error("Permintaan sudah diproses.");
  await assertCanReviewRequest(request, reviewerRole);

  if (request.type === "void_order") {
    await executeVoidOrder(request.refId, request.reason ?? "Disetujui approval", reviewerId);
  } else if (request.type === "void_item") {
    await executeVoidItem(request.refId, request.reason ?? "Disetujui approval", reviewerId);
  } else if (request.type === "refund") {
    await executeRefundOrder(request.refId, request.reason ?? "Disetujui approval", reviewerId);
  }

  const [updated] = await db
    .update(approvalRequests)
    .set({ status: "approved", reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote: note })
    .where(eq(approvalRequests.id, requestId))
    .returning();

  await logAudit({ outletId: request.outletId, staffUserId: reviewerId, action: "approve_request", entityType: "approval_request", entityId: requestId });
  return updated;
}

export async function rejectRequest(requestId: string, reviewerId: string, reviewerRole: StaffRole, note?: string) {
  const [request] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Permintaan tidak ditemukan.");
  if (request.status !== "pending") throw new Error("Permintaan sudah diproses.");
  await assertCanReviewRequest(request, reviewerRole);

  const [updated] = await db
    .update(approvalRequests)
    .set({ status: "rejected", reviewedBy: reviewerId, reviewedAt: new Date().toISOString(), reviewNote: note })
    .where(eq(approvalRequests.id, requestId))
    .returning();

  await logAudit({ outletId: updated.outletId, staffUserId: reviewerId, action: "reject_request", entityType: "approval_request", entityId: requestId });
  return updated;
}
