import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, SessionPayload } from "@/lib/auth/session";

/** Thrown by requireOwnedOrder — carries the HTTP status the calling route should respond with. */
export class ScopeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the caller is logged in AND the given order belongs to their outlet.
 * Every /api/orders/[id]/* route (bill, checkout-options, pay, receipt, split,
 * refund-request, void-request, settle, hard-delete) must call this before reading
 * or mutating anything — these routes previously had little to no auth, letting
 * anyone read or pay/void/refund/delete any other outlet's orders just by knowing
 * or guessing the order id.
 */
export async function requireOwnedOrder(orderId: string): Promise<{ session: SessionPayload; order: typeof orders.$inferSelect }> {
  const session = await getSession();
  if (!session) throw new ScopeError("Belum login.", 401);
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  // Same 404 whether the id doesn't exist or belongs to another outlet — don't leak which.
  if (!order || order.outletId !== session.outletId) throw new ScopeError("Order tidak ditemukan.", 404);
  return { session, order };
}
