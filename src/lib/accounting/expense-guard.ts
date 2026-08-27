import { db } from "@/db/client";
import { expenses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, SessionPayload } from "@/lib/auth/session";

export class ScopeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Verifies the caller is logged in AND the given expense belongs to their outlet — every
 *  /api/expenses/[id]/* route (approve, reject, pay, cancel, void, submit) must call this
 *  first, since these previously let anyone approve/pay/void any other outlet's expenses. */
export async function requireOwnedExpense(expenseId: string): Promise<{ session: SessionPayload; expense: typeof expenses.$inferSelect }> {
  const session = await getSession();
  if (!session) throw new ScopeError("Belum login.", 401);
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId)).limit(1);
  if (!expense || expense.outletId !== session.outletId) throw new ScopeError("Expense tidak ditemukan.", 404);
  return { session, expense };
}
