/**
 * Fetch JSON and guarantee an array back, even if the server errored or
 * returned something unexpected. Route handlers can legitimately return
 * `{ error: "..." }` (e.g. on a DB error, see rental-sessions crash from
 * a stale schema) — without this guard, any code that immediately calls
 * .filter()/.map()/.reduce()/.sort() on the raw response crashes the whole
 * page instead of just showing an empty list. Always prefer this over
 * `fetch(url).then((r) => r.json())` for endpoints that return a list.
 */
export async function fetchJsonArray<T = any>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`GET ${url} gagal (${res.status}):`, (data as any)?.error ?? data);
      return [];
    }
    if (!Array.isArray(data)) {
      console.error(`GET ${url} tidak mengembalikan array:`, data);
      return [];
    }
    return data as T[];
  } catch (err) {
    console.error(`GET ${url} gagal:`, err);
    return [];
  }
}

/**
 * Fetch JSON and guarantee either the real object or `null` — never an
 * error-shaped payload. Route handlers can return `{ error: "..." }` on a
 * DB failure; without this guard, `data ? data.someField.sub : "—"` still
 * crashes because the `data ?` check only verifies data is truthy, not that
 * it has the expected shape. Always prefer this over
 * `fetch(url).then((r) => r.json())` for endpoints that return a single object.
 */
export async function fetchJsonObject<T = any>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      console.error(`GET ${url} gagal (${res.status}):`, (data as any)?.error ?? data);
      return null;
    }
    return data as T;
  } catch (err) {
    console.error(`GET ${url} gagal:`, err);
    return null;
  }
}
