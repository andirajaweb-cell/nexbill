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
 * max: kept modest since this is a single Postgres instance shared by every
 * outlet (pooled multi-tenancy) AND by every concurrent serverless instance —
 * the DB/pooler has a fixed capacity regardless of how many of the 2000 outlets
 * are active at once, so a large per-instance pool from just this one Next.js
 * server (times however many instances Vercel spins up concurrently) would
 * crowd out headroom. Tune once real concurrent-load numbers exist.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — required for the Postgres (Supabase) client.");
}

const client = postgres(connectionString, { max: 3, prepare: false });

export const db = drizzle(client, { schema });
export type DB = typeof db;
