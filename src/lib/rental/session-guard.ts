import { db } from "@/db/client";
import { rentalSessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, SessionPayload } from "@/lib/auth/session";

/** Thrown by requireOwnedRentalSession/requireOwnedOrder — carries the HTTP status the calling
 *  route should respond with, so every call site can just do `errorStatus(err, 400)`. */
export class ScopeError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the caller is logged in AND the given rental session belongs to their outlet.
 * Every /api/rental-sessions/[id]/* action route (pause, resume, extend, transfer, stop,
 * change-customer, accessories, bill) must call this before reading or mutating anything —
 * these routes previously had zero auth at all, letting anyone pause/stop/transfer any other
 * outlet's live sessions just by guessing/enumerating session ids.
 */
export async function requireOwnedRentalSession(sessionId: string): Promise<{ session: SessionPayload; row: typeof rentalSessions.$inferSelect }> {
  const session = await getSession();
  if (!session) throw new ScopeError("Belum login.", 401);
  const [row] = await db.select().from(rentalSessions).where(eq(rentalSessions.id, sessionId)).limit(1);
  // Same 404 whether the id doesn't exist or belongs to another outlet — don't leak which.
  if (!row || row.outletId !== session.outletId) throw new ScopeError("Sesi rental tidak ditemukan.", 404);
  return { session, row };
}
