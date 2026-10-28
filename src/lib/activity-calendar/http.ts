/**
 * HTTP JSON dengan batas waktu dan coba-ulang terkendali, dipakai service BMKG & Footballdata.io.
 * - Timeout per percobaan (AbortSignal.timeout).
 * - Coba ulang HANYA untuk gangguan sementara: jaringan/timeout, 5xx, dan 429 (bila `retry429`).
 *   4xx lain (kunci salah, parameter salah) tidak diulang — mengulang hanya membuang kuota.
 * - Jeda eksponensial + jitter, menghormati Retry-After (maks. 5 detik).
 * - Log aman: hanya host + path, tanpa header (API key) dan tanpa isi respons.
 */

export class HttpJsonError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly body: unknown = null
  ) {
    super(message);
  }
}

export interface FetchJsonOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  retry429?: boolean;
  label: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function safeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return "url";
  }
}

export async function fetchJson(url: string, opts: FetchJsonOptions): Promise<{ status: number; json: unknown }> {
  const retries = opts.retries ?? 2;
  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "NEXBILL/1.0 (+https://nexbill.id)", ...(opts.headers ?? {}) },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 8000),
        cache: "no-store",
      });
      const text = await res.text();
      let json: unknown = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      if (res.ok) {
        if (json === null) throw new HttpJsonError(`${opts.label}: respons bukan JSON`, res.status);
        return { status: res.status, json };
      }
      const transient = res.status >= 500 || (res.status === 429 && opts.retry429);
      const err = new HttpJsonError(`${opts.label}: HTTP ${res.status}`, res.status, json);
      if (!transient || attempt === retries) throw err;
      lastErr = err;
      const ra = Number(res.headers.get("retry-after"));
      const wait = Number.isFinite(ra) && ra > 0 ? Math.min(5000, ra * 1000) : 600 * 2 ** attempt + Math.random() * 300;
      console.warn(`[activity-calendar] ${opts.label} ${safeUrl(url)} HTTP ${res.status}, coba lagi (${attempt + 1}/${retries})`);
      await sleep(wait);
    } catch (err) {
      if (err instanceof HttpJsonError) throw err;
      lastErr = err;
      const name = (err as Error)?.name;
      const reason = name === "TimeoutError" || name === "AbortError" ? "timeout" : "jaringan";
      if (attempt === retries) throw new HttpJsonError(`${opts.label}: gagal terhubung (${reason})`, null);
      console.warn(`[activity-calendar] ${opts.label} ${safeUrl(url)} ${reason}, coba lagi (${attempt + 1}/${retries})`);
      await sleep(600 * 2 ** attempt + Math.random() * 300);
    }
  }
  throw lastErr instanceof Error ? lastErr : new HttpJsonError(`${opts.label}: gagal`, null);
}

/** Postgres 42P01 = tabel belum ada (migrasi 0039 belum dijalankan). */
export function isMissingRelation(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

/** HTML/teks dengan batas waktu & coba-ulang terbatas (5xx/jaringan saja). Untuk pengambilan jadwal dari situs resmi. */
export async function fetchText(url: string, opts: Omit<FetchJsonOptions, "retry429">): Promise<string> {
  const retries = opts.retries ?? 1;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "NEXBILL-Jadwal/1.0 (+https://nexbill.id; jadwal untuk kalender bisnis outlet)", ...(opts.headers ?? {}) },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
        cache: "no-store",
      });
      if (res.ok) return await res.text();
      const err = new HttpJsonError(`${opts.label}: HTTP ${res.status}`, res.status);
      if (res.status < 500 || attempt === retries) throw err;
      console.warn(`[activity-calendar] ${opts.label} ${safeUrl(url)} HTTP ${res.status}, coba lagi`);
    } catch (err) {
      if (err instanceof HttpJsonError) throw err;
      if (attempt === retries) throw new HttpJsonError(`${opts.label}: gagal terhubung`, null);
    }
    await sleep(1000 * 2 ** attempt);
  }
  throw new HttpJsonError(`${opts.label}: gagal`, null);
}
