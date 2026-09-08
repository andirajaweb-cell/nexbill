import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Task #63 — automated test suite for the accounting engine. These tests are pure unit tests of
 * accounting LOGIC (balance enforcement, classification/mapping rules, RBAC, period-lock date
 * math) — they never touch a real database. Files under src/lib/accounting/** import
 * "@/db/client" transitively (it constructs the drizzle client at module scope), so
 * vitest.setup.ts sets a syntactically-valid but never-dialed DATABASE_URL before any imports
 * run. postgres.js's client is lazy (confirmed empirically — see the commit message for Task
 * #63) so constructing it doesn't attempt a real connection; nothing in this suite calls a
 * function that would actually run a query, so no live database is ever required to run these
 * tests, in this sandbox or in CI.
 */
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
