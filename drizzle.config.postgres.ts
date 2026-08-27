import { defineConfig } from "drizzle-kit";

/**
 * Staged Postgres (Supabase) drizzle-kit config — not yet the live drizzle.config.ts.
 * Swapped in at cutover time. Uses DATABASE_URL (Supabase "Session" pooler
 * connection string, port 5432) so `drizzle-kit push` can run DDL statements
 * that the "Transaction" pooler (port 6543) doesn't support.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — required for drizzle-kit push against Postgres (Supabase).");
}

export default defineConfig({
  schema: "./src/db/schema.postgres.ts",
  out: "./drizzle-postgres",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
