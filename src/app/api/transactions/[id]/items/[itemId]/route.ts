import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { deleteOrderItem } from "@/lib/pos/item-correction";
import { describeError } from "@/lib/api/error";

/**
 * Deletes a single line item from an order that's ALREADY PAID — e.g. a genuinely duplicate rental
 * line left over from merging several TVs'/sessions' bills into one order (mergeOrders in
 * lib/pos/split-merge.ts). The existing per-item void (executeVoidItem, lib/pos/void.ts) explicitly
 * refuses both conditions this needs to handle (order.status === "paid" and itemType === "rental"),
 * so this uses the separate deleteOrderItem (lib/pos/item-correction.ts), which reuses the same
 * void+repost journal-correction pattern as the rental/payment amount corrections. Exact-role check
 * (owner/superuser only), same pattern as the other high-risk Transaction Center actions on this
 * page — see PATCH .../payments/[paymentId] and .../rental-charge for the sibling checks this must
 * stay in sync with.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya Owner/Superuser yang bisa menghapus item transaksi." }, { status: 403 });
    }

    const { id: orderId, itemId } = await params;

    // Scope check: the order and the item must both belong to the caller's own outlet — never
    // trust the URL params alone for cross-outlet isolation.
    const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.outletId !== session.outletId) return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
    const [item] = await db.select({ id: orderItems.id, orderId: orderItems.orderId }).from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
    if (!item || item.orderId !== orderId) return NextResponse.json({ error: "Item tidak ditemukan pada transaksi ini." }, { status: 404 });

    const result = await deleteOrderItem(orderId, itemId, session.sub);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
