/**
 * Raw infrastructure/driver error signatures that should never reach an end user verbatim — a
 * cashier/owner staring at "(EMAXCONNSESSION) max clients reached in session mode - max clients
 * are limited to pool_size: 15" in a popup has no way to act on it, it just reads as the app being
 * broken. These are all connection-pool exhaustion errors from the Supabase/pgbouncer layer
 * (Session-mode pooler capped at a small pool_size, hit when too many concurrent DB connections
 * pile up) — recognizable, expected-to-happen-occasionally infra hiccups, not user-caused bugs.
 * Matched independently of the DB client's own pooler config (see src/db/client.ts, which already
 * uses the Transaction pooler + a small `max` for exactly this reason) because this can still
 * surface from OTHER processes sharing the same Postgres project's connection budget — e.g.
 * scripts/relay-hub.ts running as a separate long-lived process, or a misconfigured DATABASE_URL
 * somewhere in the deploy environment pointing at the Session pooler (port 5432) instead of the
 * Transaction pooler (port 6543).
 */
const POOL_EXHAUSTED_PATTERNS = [/EMAXCONNSESSION/i, /max clients reached/i, /too many (clients|connections)/i, /remaining connection slots/i];

/**
 * Drizzle wraps every DB failure in a generic "Failed query: select ..."
 * message and puts the actual, useful error (e.g. "SQLITE_ERROR: no such
 * table: outlets") on `err.cause`. Route handlers were surfacing only
 * `err.message`, which told the user nothing diagnosable. This unwraps to
 * the real cause so error responses (and the browser console) show what
 * actually broke — missing table, missing column, locked file, etc.
 *
 * One exception: raw connection-pool-exhaustion errors (see POOL_EXHAUSTED_PATTERNS above) are
 * swapped for a friendly, retry-oriented message instead of being unwrapped to the user — the raw
 * driver text is still logged server-side via console.error so it stays diagnosable from the
 * server logs, just not dumped into a user-facing modal.
 */
export function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const cause = "cause" in err ? (err as { cause?: unknown }).cause : undefined;
    const causeMessage = cause && typeof cause === "object" && "message" in cause ? (cause as { message?: unknown }).message : undefined;
    const message = "message" in err ? (err as { message?: unknown }).message : undefined;
    const raw = (typeof causeMessage === "string" && causeMessage.length > 0) ? causeMessage
      : (typeof message === "string" && message.length > 0) ? message
      : null;
    if (raw) {
      if (POOL_EXHAUSTED_PATTERNS.some((p) => p.test(raw))) {
        console.error("[describeError] DB connection pool exhausted:", raw);
        return "Server sedang sibuk (koneksi database penuh). Coba lagi dalam beberapa detik.";
      }
      return raw;
    }
  }
  return "Terjadi kesalahan pada server.";
}

/**
 * Extracts the HTTP status a thrown error asked to be responded with — every domain's ScopeError
 * class (src/lib/{auth/scope,rental/session-guard,pos/order-guard,accounting/expense-guard}.ts)
 * sets a `status: number` field so route handlers can respond with the right code (401/403/404)
 * instead of a blanket 400/500. Works against any of them without importing each specific class,
 * since they all just carry the same shape.
 */
export function errorStatus(err: unknown, fallback: number): number {
  if (err && typeof err === "object" && "status" in err) {
    const status = (err as { status?: unknown }).status;
    if (typeof status === "number") return status;
  }
  return fallback;
}
