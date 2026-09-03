import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Live Postgres (Supabase) client, cut over from SQLite. The pre-cutover
 * SQLite client is preserved at src/db/client.sqlite.ts.
 *
 * DATABASE_URL must be the Supabase "Transaction" pooler connection string
 * (port 6543), NOT the "Session" pooler (port 5432). This app runs as Vercel
 * serverless functions — many concurrent instances can be alive at once, and
 * each one used to open its own session against the pooler. Session mode caps
 * total concurrent sessions (commonly pool_size: 15) shared across ALL of
 * those instances, so any real traffic quickly hit:
 *   "(EMAXCONNSESSION) max clients reached in session mode - max clients are
 *   limited to pool_size: 15"
 * Transaction mode instead multiplexes many client connections over a shared
 * backend pool per-transaction, which is exactly what a fleet of serverless
 * instances needs. `prepare: false` is required alongside it because pgbouncer
 * transaction-mode pooling doesn't support named prepared statements persisting
 * across a connection the way session mode does.
 *
 * Migrations (drizzle-kit push) still need a real session for DDL — that uses
 * the separate DIRECT_URL (session-mode, port 5432) in drizzle.config.ts, not
 * this file.
 *
 * max: bumped from 3 to 10 (real concurrent-load numbers now exist — see the client-side
 * polling/dedup fixes in dashboard/rental/page.tsx and SubscriptionGate.tsx from the same pass).
 * 3 was low enough that a SINGLE API route doing its own internal Promise.all of a few parallel
 * queries (a normal, correct pattern — see reports/transactions.ts, dashboard/owner/route.ts)
 * could exhaust the whole per-instance pool by itself, queuing its own unrelated queries behind
 * each other before any other request even arrives. Transaction-mode pgbouncer (which this pooler
 * connection string uses) is built to multiplex many client connections over a much smaller
 * backend pool efficiently, so headroom here is cheap relative to the cost of serializing a
 * single request's own queries. Still conservative given this is shared by every concurrent
 * serverless instance across every outlet — raise further only with real pooler metrics in hand.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — required for the Postgres (Supabase) client.");
}

const client = postgres(connectionString, { max: 10, prepare: false });

export const db = drizzle(client, { schema });
export type DB = typeof db;
