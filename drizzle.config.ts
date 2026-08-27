import { defineConfig } from "drizzle-kit";

/**
 * Live drizzle-kit config, cut over from SQLite to Postgres (Supabase).
 * The pre-cutover SQLite config is preserved at drizzle.config.sqlite.ts.
 *
 * Uses DIRECT_URL (Supabase "Session" pooler connection string, port 5432) so
 * `drizzle-kit push` can run DDL statements that the "Transaction" pooler
 * (port 6543) doesn't support. This is deliberately a DIFFERENT env var from
 * the app's runtime DATABASE_URL (see src/db/client.ts), which now points at
 * the transaction pooler instead — mixing the two caused production DB
 * connection-pool exhaustion ("max clients reached in session mode") once
 * concurrent serverless traffic opened more sessions than the session pooler
 * allows. Falls back to DATABASE_URL if DIRECT_URL isn't set, for local setups
 * that haven't added the separate var yet.
 */
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL (or DATABASE_URL) is not set — required for drizzle-kit push against Postgres (Supabase).");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
