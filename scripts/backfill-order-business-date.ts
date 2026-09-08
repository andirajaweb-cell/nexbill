/**
 * One-off data repair: backfills orders.business_date for existing rows created BEFORE this
 * column existed (see the doc comment on `businessDate` in src/db/schema.ts for the full
 * rationale — Business Date is the date a transaction's REVENUE belongs to, distinct from
 * `createdAt`, which for a rental order is session START time).
 *
 * Every read path (computeTransactionList, computeCashierPerformance in
 * src/lib/reports/transactions.ts) already falls back to COALESCE(business_date, created_at), so
 * this script is NOT required for correctness going forward — new orders get business_date set
 * automatically at finalization (see stopRentalSession in src/lib/rental/sessions.ts). Running
 * this is still worthwhile for two reasons: (1) it lets historical rows benefit from the same
 * "true finalization date" precision as new ones (a rental session from last month that ran past
 * midnight gets its revenue correctly attributed to the day it actually ended, not the day it
 * started), and (2) it means any future report or BI query written directly against
 * orders.business_date (without remembering the COALESCE convention) still gets correct answers
 * for historical data too.
 *
 * What this does, in two bulk UPDATEs:
 *   1. Rental orders (rental_session_id IS NOT NULL) with business_date still NULL: set to that
 *      session's ended_at (the actual finalization time), falling back to the order's own
 *      created_at if the session never has an ended_at (e.g. was force-cancelled rather than
 *      properly stopped).
 *   2. Every other order (no rental session — standalone POS/F&B/product sales) with
 *      business_date still NULL: set to created_at directly, since for those the order is
 *      created and paid in the same checkout action (see the investigation cited in the schema
 *      doc comment) — createdAt already IS the correct business date for this category.
 *
 * Safe to re-run: both UPDATEs only ever touch rows where business_date IS NULL, so a row already
 * backfilled (or one created going forward with business_date already set by the app) is never
 * touched again.
 *
 * Usage:  npx tsx scripts/backfill-order-business-date.ts
 */
import "dotenv/config";
import { db } from "../src/db/client";
import { sql } from "drizzle-orm";

async function main() {
  const rentalResult = await db.execute(sql`
    UPDATE orders o
    SET business_date = COALESCE(rs.ended_at, o.created_at)
    FROM rental_sessions rs
    WHERE o.rental_session_id = rs.id
      AND o.business_date IS NULL
  `);
  console.log(`Rental orders backfilled from their session's ended_at: ${rentalResult.count ?? "?"} row(s).`);

  const posResult = await db.execute(sql`
    UPDATE orders
    SET business_date = created_at
    WHERE business_date IS NULL
      AND rental_session_id IS NULL
  `);
  console.log(`Standalone POS/F&B/product orders backfilled from created_at: ${posResult.count ?? "?"} row(s).`);

  const [{ remaining } = { remaining: 0 }] = (await db.execute(
    sql`SELECT COUNT(*)::int AS remaining FROM orders WHERE business_date IS NULL`
  )) as unknown as { remaining: number }[];
  console.log(`\nDone. Orders still with business_date NULL (should be 0): ${remaining}`);
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
