/**
 * One-off data repair: finds "running"/"paused" rental sessions that have no
 * matching OPEN order (bill), and creates one for each.
 *
 * Root cause: startRentalSession() always creates the session and its unified
 * bill together (openBillForSession), so this pair should never drift apart
 * under normal app operation. But the Postgres migration (scripts/migrate-to-
 * postgres.ts) copied whatever was actually in the source SQLite tables —
 * and the source `orders` table had 0 rows at migration time even though
 * `rental_sessions` had 11 rows. That means these sessions were already
 * missing their bill in SQLite before the cutover (likely stale/test rows
 * from earlier development), not something the migration itself broke.
 * Symptom: GET /api/rental-sessions/[id]/bill returns 404 "Bill terbuka
 * tidak ditemukan untuk sesi ini." for an active session on the Rental page.
 *
 * Safe to re-run: only touches sessions that still have no open bill: once
 * repaired, a session is skipped on the next run.
 *
 * Usage:  npx tsx scripts/repair-missing-bills.ts
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { rentalSessions } from "../src/db/schema";
import { inArray } from "drizzle-orm";
import { getOpenBillForSession, openBillForSession } from "../src/lib/pos/bill";

async function main() {
  const active = await db
    .select()
    .from(rentalSessions)
    .where(inArray(rentalSessions.status, ["running", "paused"]));
  console.log(`Found ${active.length} running/paused rental session(s).`);

  let repaired = 0;
  for (const s of active) {
    const existing = await getOpenBillForSession(s.id);
    if (existing) continue;

    const bill = await openBillForSession({
      outletId: s.outletId,
      customerId: s.customerId,
      rentalSessionId: s.id,
      staffUserId: s.staffUserId,
      shiftId: s.shiftId,
    });
    console.log(`  Repaired session ${s.id} (outlet ${s.outletId}, unit ${s.rentalUnitId}) -> new bill ${bill.id}`);
    repaired++;
  }

  console.log(`\nDone. Repaired ${repaired} of ${active.length} session(s).`);
}

main().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
