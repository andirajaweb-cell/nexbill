import { db } from "@/db/client";
import { orders, orderItems, rentalSessions, payments } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { postSalesJournal } from "@/lib/accounting/postings";
import { reverseOrderJournalForCorrection } from "@/lib/accounting/order-journal-correction";
import { recomputeBillTotals } from "@/lib/pos/bill";
import { restockForItem } from "@/lib/inventory/stock";
import { logAudit } from "@/lib/audit/log";

/**
 * Deletes (soft-cancels) a single line item from an order that's ALREADY PAID — the case
 * executeVoidItem (lib/pos/void.ts) explicitly refuses: it throws on `order.status === "paid"`
 * ("gunakan refund, bukan void item") and separately throws on `item.itemType === "rental"`
 * ("void seluruh order jika perlu"). Both of those are exactly the situation a merged order can be
 * in: mergeOrders (lib/pos/split-merge.ts) combines several previously-separate sessions' bills
 * into one order, so a single paid order can end up with several itemType:"rental" lines (one per
 * originating TV/unit/session) that look like "duplicate" or "berulang-ulang" transactions to the
 * cashier even though each is real — and once the merged order is paid, there was previously no
 * safe way to remove a genuinely wrong/duplicate one without voiding the ENTIRE order (losing every
 * other still-correct item on the same bill).
 *
 * HOW IT WORKS: same void+repost pattern as correctPaymentMethod / correctRentalCharge — never
 * mutates a posted journal line in place. Reverses the order's journal history via the shared
 * reverseOrderJournalForCorrection() (voids the combined sales entry + every receivable settlement,
 * deletes the now-superseded receivable), restocks the item if it's a real product (F&B), marks the
 * item kitchenStatus:"cancelled" (same soft-delete marker executeVoidItem itself uses — keeps the
 * row for audit trail rather than a hard delete), then — after commit — recomputeBillTotals() and
 * postSalesJournal() rebuild the order's totals and repost a correctly-balanced journal from
 * scratch against the remaining items only.
 *
 * If the deleted item was THE order's rental charge for a single (non-merged) session
 * (order.rentalSessionId still set — only true when every merged-in order shared one session, so
 * there's normally at most one rental line in that case), rentalSessions.totalAmount is zeroed to
 * keep Dashboard/Operational revenue reports (which read that column independently of
 * orders/orderItems) from continuing to show a charge that no longer exists on the bill.
 *
 * Refuses (with a clear reason) when there's nothing safe to do: item not found on this order,
 * already deleted, the order itself is cancelled, or deleting would leave the order with zero
 * active items (use void-the-whole-order instead — an order with nothing on it isn't a valid
 * "corrected" state).
 */
export async function deleteOrderItem(orderId: string, orderItemId: string, staffUserId: string | undefined) {
  const outcome = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${orderId}))`);

    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) throw new Error("Transaksi tidak ditemukan.");
    if (order.status === "cancelled") throw new Error("Transaksi ini sudah dibatalkan — tidak ada yang perlu dihapus.");

    const [item] = await tx.select().from(orderItems).where(and(eq(orderItems.id, orderItemId), eq(orderItems.orderId, orderId))).limit(1);
    if (!item) throw new Error("Item ini tidak ditemukan pada transaksi ini.");
    if (item.kitchenStatus === "cancelled") throw new Error("Item ini sudah dihapus sebelumnya.");

    const activeItems = await tx
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, orderId), sql`${orderItems.kitchenStatus} <> 'cancelled'`));
    if (activeItems.length <= 1) {
      throw new Error("Tidak bisa menghapus satu-satunya item aktif di transaksi ini — batalkan (void) seluruh transaksi jika memang perlu.");
    }

    const reason = `Hapus item: ${item.description} (Rp${item.lineTotal.toLocaleString("id-ID")})`;
    const { hadSalesEntry, reversedReceivable } = await reverseOrderJournalForCorrection(tx, orderId, reason);

    if (item.productId) {
      await restockForItem(item.productId, item.qty, orderId, "Hapus item (koreksi transaksi lunas)", tx);
    }

    await tx
      .update(orderItems)
      .set({ kitchenStatus: "cancelled", cancelReason: reason, voidedBy: staffUserId, voidedAt: new Date().toISOString() })
      .where(eq(orderItems.id, orderItemId));

    // See doc comment: only meaningful when this order still maps to exactly one rental session.
    if (order.rentalSessionId && item.itemType === "rental") {
      await tx.update(rentalSessions).set({ totalAmount: 0 }).where(eq(rentalSessions.id, order.rentalSessionId));
    }

    return { reposted: hadSalesEntry || !!reversedReceivable, deletedItem: item, reversedReceivable };
  });

  // Always recompute — an item was removed either way, regardless of whether there was a journal
  // to void (e.g. an order that somehow never got a sales entry posted still needs its cached
  // subtotal/total updated). Same commit-then-call-separately reasoning as correctRentalCharge.
  await recomputeBillTotals(orderId);
  if (outcome.reposted) {
    await postSalesJournal(orderId);
  }

  // Re-derive status from payments vs the new (lower) total, mirroring correctRentalCharge — a
  // deletion can turn a "paid" order into an over-paid one that's still functionally paid (fine,
  // left alone) but never needs to move to "partial" the way a correction that INCREASES the total
  // can; still safe to run the same logic either way.
  const [freshOrder] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (freshOrder) {
    const successPayments = await db.select({ amount: payments.amount }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "success")));
    const paidTotal = successPayments.reduce((s, p) => s + p.amount, 0);
    if (paidTotal > 0) {
      const fullyPaid = paidTotal >= freshOrder.total - 0.5;
      const newStatus = fullyPaid ? "paid" : "partial";
      if (newStatus !== freshOrder.status) {
        await db.update(orders).set({ status: newStatus }).where(eq(orders.id, orderId));
      }
    }
  }

  await logAudit({
    staffUserId,
    action: "delete_order_item",
    entityType: "order_item",
    entityId: orderItemId,
    before: { orderId, item: outcome.deletedItem, reversedReceivable: outcome.reversedReceivable },
  });

  return { orderId, orderItemId, deletedItem: outcome.deletedItem };
}
