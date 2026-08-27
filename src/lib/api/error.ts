/**
 * Drizzle wraps every DB failure in a generic "Failed query: select ..."
 * message and puts the actual, useful error (e.g. "SQLITE_ERROR: no such
 * table: outlets") on `err.cause`. Route handlers were surfacing only
 * `err.message`, which told the user nothing diagnosable. This unwraps to
 * the real cause so error responses (and the browser console) show what
 * actually broke — missing table, missing column, locked file, etc.
 */
export function describeError(err: unknown): string {
  if (err && typeof err === "object") {
    const cause = "cause" in err ? (err as { cause?: unknown }).cause : undefined;
    const causeMessage = cause && typeof cause === "object" && "message" in cause ? (cause as { message?: unknown }).message : undefined;
    if (typeof causeMessage === "string" && causeMessage.length > 0) return causeMessage;
    const message = "message" in err ? (err as { message?: unknown }).message : undefined;
    if (typeof message === "string" && message.length > 0) return message;
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
