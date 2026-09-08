// Task #63: modules under src/lib/accounting/** and src/db/** construct a drizzle/postgres.js
// client at import time (src/db/client.ts throws if DATABASE_URL is unset). postgres.js's client
// is lazy — it never actually dials until a query runs — so a syntactically-valid placeholder
// here is enough to let every accounting module import cleanly in the test process without a
// real database, since none of the unit tests in this suite execute a query.
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/nexbill_test";
process.env.JWT_SECRET ||= "test-secret-do-not-use-in-production";
