import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.postgres";

/**
 * Staged Postgres (Supabase) client — not yet wired in as the live `src/db/client.ts`.
 * Swapped in at cutover time once DATABASE_URL is set and data migration is verified.
 *
 * Use the Supabase "Session" pooler connection string (port 5432) here, not the
 * "Transaction" pooler (port 6543) — drizzle-kit push and any code that relies on
 * prepared statements / multi-statement sessions needs a session-mode connection.
 * The app's own runtime queries are fine on either, but session mode is simplest
 * while RLS enforcement (Opsi A: per-request `app.outlet_id`) isn't wired yet.
 *
 * max: kept modest since this is a single Postgres instance shared by every
 * outlet (pooled multi-tenancy) — the DB has a fixed max_connections regardless
 * of how many of the 2000 outlets are active at once, so a large per-instance
 * pool from just this one Next.js server would crowd out headroom. Tune once
 * real concurrent-load numbers exist.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — required for the Postgres (Supabase) client.");
}

const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });
export type DB = typeof db;
