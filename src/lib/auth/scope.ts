import { db } from "@/db/client";
import { eq } from "drizzle-orm";
import { orderItems, orders, payments, sessionAccessories, rentalSessions } from "@/db/schema";
import { getSession, SessionPayload } from "./session";

/**
 * Thrown by requireOwnedRow (and the domain-specific guards in lib/rental/session-guard.ts,
 * lib/accounting/expense-guard.ts) — carries the HTTP status the calling route should respond
 * with, so every call site can just do `errorStatus(err, 400)`.
 */
export class ScopeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Generic cross-tenant ownership guard: fetch a row from `table` by id, verify the caller is
 * logged in AND that row's `outletId` matches their own. Use this at the top of any
 * `/api/<resource>/[id]/*` route handler for a table that has its own `outletId` column, before
 * reading or mutating anything — this closes the exact IDOR class found across the app's audit
 * (routes that fetched a row by bare id with only a role check, letting any staff member at one
 * outlet read/edit/delete another outlet's row just by guessing/enumerating ids).
 *
 * For a table with no `outletId` column of its own (scoped indirectly through a parent, e.g.
 * `recipes` via its product, `session-accessories` via its rental session), write a
 * resource-specific guard instead — see lib/rental/session-guard.ts for the pattern.
 */
export async function requireOwnedRow<T extends { id: string; outletId: string }>(
  table: any,
  id: string,
  notFoundMessage = "Data tidak ditemukan."
): Promise<{ session: SessionPayload; row: T }> {
  const session = await getSession();
  if (!session) throw new ScopeError("Belum login.", 401);
  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  // Same 404 whether the id doesn't exist or belongs to another outlet — don't leak which.
  if (!row || (row as any).outletId !== session.outletId) throw new ScopeError(notFoundMessage, 404);
  return { session, row: row as T };
}

/**
 * `orderItems` has no `outletId` of its own — scoped indirectly through its parent order. Used
 * by the kitchen/void order-item action routes (advance, cancel, void-request), which previously
 * had zero auth at all and also trusted a client-supplied staffUserId/role instead of the
 * session — both closed here: caller identity/role always comes from the session now, never the
 * request body.
 */
export async function requireOwnedOrderItem(orderItemId: string): Promise<{ session: SessionPayload; item: typeof orderItems.$inferSelect }> {
  const session = await getSession();
  if (!session) throw new ScopeError("Belum login.", 401);
  const [item] = await db.select().from(orderItems).where(eq(orderItems.id, orderItemId)).limit(1);
  if (!item) throw new ScopeError("Item tidak ditemukan.", 404);
  const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, item.orderId)).limit(1);
  if (!order || order.outletId !== session.outletId) throw new ScopeError("Item tidak ditemukan.", 404);
  return { session, item };
}

/** `payments` has no `outletId` of its own — scoped indirectly through its parent order. Used by confirm-cash/confirm-deposit, which previously had zero auth at all. */
export async function requireOwnedPayment(paymentId: string): Promise<{ session: SessionPayload; payment: typeof payments.$inferSelect }> {
  const session = await getSession();
  if (!session) throw new ScopeError("Belum login.", 401);
  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) throw new ScopeError("Pembayaran tidak ditemukan.", 404);
  const [order] = await db.select({ outletId: orders.outletId }).from(orders).where(eq(orders.id, payment.orderId)).limit(1);
  if (!order || order.outletId !== session.outletId) throw new ScopeError("Pembayaran tidak ditemukan.", 404);
  return { session, payment };
}

/** `sessionAccessories` has no `outletId` of its own — scoped indirectly through its parent rental session. */
export async function requireOwnedSessionAccessory(accessoryId: string): Promise<{ session: SessionPayload; accessory: typeof sessionAccessories.$inferSelect }> {
  const session = await getSession();
  if (!session) throw new ScopeError("Belum login.", 401);
  const [accessory] = await db.select().from(sessionAccessories).where(eq(sessionAccessories.id, accessoryId)).limit(1);
  if (!accessory) throw new ScopeError("Accessory tidak ditemukan.", 404);
  const [rentalSession] = await db.select({ outletId: rentalSessions.outletId }).from(rentalSessions).where(eq(rentalSessions.id, accessory.rentalSessionId)).limit(1);
  if (!rentalSession || rentalSession.outletId !== session.outletId) throw new ScopeError("Accessory tidak ditemukan.", 404);
  return { session, accessory };
}
