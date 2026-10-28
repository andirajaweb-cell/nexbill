/**
 * Service jadwal sepak bola Footballdata.io (server). API key HANYA dari env server
 * FOOTBALL_DATA_API_KEY — tidak pernah dikirim ke browser atau ditulis ke log. Satu sinkron untuk SEMUA
 * outlet (jadwal pertandingan sama di mana pun), disimpan di activity_football_matches; outlet
 * memfilter liga pilihannya saat membaca. Kuota bulanan dijaga: sinkron otomatis tiap 6 jam, maksimal
 * 5 halaman, berhenti otomatis bila sisa kuota tipis. Aturan murni ada di football-rules.ts.
 */
import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { activityFootballMatches, activitySyncState } from "@/db/schema";
import { fetchJson, HttpJsonError } from "./http";
import {
  extractList,
  extractMeta,
  FOOTBALL_BACKFILL_DAYS,
  FOOTBALL_FUTURE_DAYS,
  FOOTBALL_LEAGUES_EVERY_MS,
  FOOTBALL_MAX_PAGES,
  FOOTBALL_PAST_DAYS,
  footballNeedsSync,
  isoDateOffset,
  normalizeLeague,
  normalizeMatch,
  quotaLow,
  sortLeagues,
  type FootballLeague,
  type FootballMatch,
} from "./football-rules";

const BASE = (process.env.FOOTBALL_DATA_API_BASE || "https://footballdata.io/api/v1").replace(/\/$/, "");
const STATE_MATCHES = "football";
const STATE_LEAGUES = "football_leagues";

export function footballConfigured(): boolean {
  return !!process.env.FOOTBALL_DATA_API_KEY?.trim();
}

export class FootballApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number | null
  ) {
    super(message);
  }
}

/** Pesan aman untuk UI dari error API (kode error Footballdata.io didokumentasikan di /documentation/errors). */
function friendly(err: unknown): FootballApiError {
  if (err instanceof FootballApiError) return err;
  if (err instanceof HttpJsonError) {
    const body = err.body as { error?: { code?: string } } | null;
    const code = body?.error?.code ?? `http_${err.status ?? "network"}`;
    if (err.status === 401 || code === "invalid_api_key" || code === "missing_api_key") return new FootballApiError("Kunci akses sumber jadwal tidak valid.", code, err.status);
    if (err.status === 403) return new FootballApiError("Kunci akses sumber jadwal tidak aktif atau fitur tidak termasuk paket.", code, err.status);
    if (err.status === 429) return new FootballApiError("Kuota bulanan sumber jadwal habis — jadwal tersimpan tetap tampil sampai kuota pulih.", "rate_limit_exceeded", 429);
    if (err.status == null) return new FootballApiError("Sumber jadwal tidak dapat dihubungi (timeout/jaringan).", "network", null);
    return new FootballApiError(`Sumber jadwal bermasalah (HTTP ${err.status}).`, code, err.status);
  }
  return new FootballApiError("Gagal memproses data jadwal.", "unknown", null);
}

async function fdGet(path: string, params: Record<string, string | number> = {}) {
  const key = process.env.FOOTBALL_DATA_API_KEY?.trim();
  if (!key) throw new FootballApiError("FOOTBALL_DATA_API_KEY belum diisi di server.", "missing_api_key", null);
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  try {
    const { json } = await fetchJson(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
      label: "Footballdata.io",
      headers: { Authorization: `Bearer ${key}` },
      timeoutMs: 10_000,
      retries: 2,
      retry429: false, // 429 = kuota BULANAN habis — mengulang tidak menolong
    });
    const root = json as { success?: boolean; error?: { code?: string; message?: string } };
    if (root?.success === false) throw new FootballApiError("Sumber jadwal menolak permintaan.", root.error?.code ?? "error", null);
    return { json, meta: extractMeta(json) };
  } catch (err) {
    throw friendly(err);
  }
}

/* ------------------------------------------------------------------ status sinkron ------------------------------------------------------------------ */

export interface FootballState {
  plan: string | null;
  requestsUsed: number | null;
  requestsLimit: number | null;
  backfilled?: boolean;
  lastCount?: number;
}

async function readState(key: string) {
  const [row] = await db.select().from(activitySyncState).where(eq(activitySyncState.key, key)).limit(1);
  return row ?? null;
}

async function writeState(key: string, patch: Partial<typeof activitySyncState.$inferInsert>) {
  const now = new Date().toISOString();
  await db
    .insert(activitySyncState)
    .values({ key, ...patch, updatedAt: now })
    .onConflictDoUpdate({ target: activitySyncState.key, set: { ...patch, updatedAt: now } });
}

function parseJson<T>(s: string | null | undefined): T | null {
  try {
    return s ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ liga ------------------------------------------------------------------ */

/** Liga yang tersedia di paket API key (cache 24 jam). */
export async function syncLeagues(force = false): Promise<FootballLeague[]> {
  const st = await readState(STATE_LEAGUES);
  const cached = parseJson<{ leagues: FootballLeague[] }>(st?.payload)?.leagues ?? [];
  const fresh = st?.lastSuccessAt && Date.now() - new Date(st.lastSuccessAt).getTime() < FOOTBALL_LEAGUES_EVERY_MS;
  if (!footballConfigured() || (fresh && !force && cached.length > 0)) return cached;
  const now = new Date().toISOString();
  try {
    const { json, meta } = await fdGet("/leagues");
    const leagues = sortLeagues(extractList(json).map(normalizeLeague).filter((l): l is FootballLeague => !!l));
    await writeState(STATE_LEAGUES, { payload: JSON.stringify({ leagues, plan: meta.plan }), lastSuccessAt: now, lastAttemptAt: now, lastError: null, lastErrorAt: null });
    await mergeUsage(meta);
    return leagues;
  } catch (err) {
    const e = friendly(err);
    console.warn(`[activity-calendar] Footballdata.io /leagues: ${e.code}`);
    await writeState(STATE_LEAGUES, { lastAttemptAt: now, lastError: e.message, lastErrorAt: now }).catch(() => undefined);
    return cached;
  }
}

export async function cachedLeagues(): Promise<FootballLeague[]> {
  const st = await readState(STATE_LEAGUES);
  return parseJson<{ leagues: FootballLeague[] }>(st?.payload)?.leagues ?? [];
}

/** Simpan angka kuota terbaru dari meta respons (setiap respons membawa requests_used/limit). */
async function mergeUsage(meta: { plan: string | null; requestsUsed: number | null; requestsLimit: number | null }) {
  if (meta.requestsUsed == null && meta.plan == null) return;
  const st = await readState(STATE_MATCHES);
  const prev = parseJson<FootballState>(st?.payload) ?? { plan: null, requestsUsed: null, requestsLimit: null };
  const next: FootballState = { ...prev, plan: meta.plan ?? prev.plan, requestsUsed: meta.requestsUsed ?? prev.requestsUsed, requestsLimit: meta.requestsLimit ?? prev.requestsLimit };
  await writeState(STATE_MATCHES, { payload: JSON.stringify(next) });
}

/* ------------------------------------------------------------------ pertandingan ------------------------------------------------------------------ */

let syncing: Promise<{ ok: boolean; count: number; error?: string }> | null = null;

/**
 * Sinkron jadwal & hasil: 7 hari lalu s.d. 30 hari ke depan (sinkron pertama: 60 hari lalu, untuk
 * analisis). `force` = tombol "Perbarui sekarang" (tetap ditolak bila kuota habis/429).
 */
export async function syncMatches(opts: { force?: boolean } = {}): Promise<{ ok: boolean; count: number; error?: string; skipped?: string }> {
  if (!footballConfigured()) return { ok: false, count: 0, skipped: "not_configured" };
  if (syncing) return syncing;
  const st = await readState(STATE_MATCHES);
  const state = parseJson<FootballState>(st?.payload) ?? { plan: null, requestsUsed: null, requestsLimit: null };
  if (!opts.force && !footballNeedsSync(st?.lastSuccessAt ?? null, st?.lastAttemptAt ?? null, st?.lastErrorAt ?? null)) return { ok: true, count: 0, skipped: "fresh" };
  if (!opts.force && quotaLow(state)) return { ok: false, count: 0, skipped: "quota_low" };

  syncing = (async () => {
    const now = new Date();
    const nowIso = now.toISOString();
    const from = isoDateOffset(now, -(state.backfilled ? FOOTBALL_PAST_DAYS : FOOTBALL_BACKFILL_DAYS));
    const to = isoDateOffset(now, FOOTBALL_FUTURE_DAYS);
    let count = 0;
    let lastMeta = extractMeta(null);
    try {
      for (let page = 1; page <= FOOTBALL_MAX_PAGES; page++) {
        const { json, meta } = await fdGet("/matches", { from, to, page, limit: 100 });
        lastMeta = meta;
        const matches = extractList(json).map(normalizeMatch).filter((m): m is FootballMatch => !!m);
        await upsertMatches(matches);
        count += matches.length;
        const totalPages = meta.totalPages ?? 1;
        if (page >= totalPages || matches.length === 0) break;
        if (quotaLow(meta)) break;
      }
      const next: FootballState = {
        plan: lastMeta.plan ?? state.plan,
        requestsUsed: lastMeta.requestsUsed ?? state.requestsUsed,
        requestsLimit: lastMeta.requestsLimit ?? state.requestsLimit,
        backfilled: true,
        lastCount: count,
      };
      await writeState(STATE_MATCHES, { payload: JSON.stringify(next), lastSuccessAt: nowIso, lastAttemptAt: nowIso, lastError: null, lastErrorAt: null });
      return { ok: true, count };
    } catch (err) {
      const e = friendly(err);
      console.warn(`[activity-calendar] Footballdata.io /matches: ${e.code}`);
      await writeState(STATE_MATCHES, { lastAttemptAt: nowIso, lastError: e.message, lastErrorAt: nowIso }).catch(() => undefined);
      return { ok: false, count, error: e.message };
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}

async function upsertMatches(list: FootballMatch[]) {
  const now = new Date().toISOString();
  for (const m of list) {
    const row = {
      leagueId: m.leagueId,
      leagueName: m.leagueName,
      country: m.country,
      seasonId: m.seasonId,
      kickoffUtc: m.kickoffUtc,
      status: m.rawStatus,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      homeLogo: m.homeLogo,
      awayLogo: m.awayLogo,
      scoreHome: m.scoreHome,
      scoreAway: m.scoreAway,
      updatedAt: now,
    };
    await db.insert(activityFootballMatches).values({ matchId: m.matchId, ...row }).onConflictDoUpdate({ target: activityFootballMatches.matchId, set: row });
  }
}

/** Pertandingan tersimpan dalam rentang waktu UTC, opsional difilter liga. */
export async function storedMatches(fromUtc: string, toUtc: string, leagueIds: string[] | null) {
  const where = [gte(activityFootballMatches.kickoffUtc, fromUtc), lte(activityFootballMatches.kickoffUtc, toUtc)];
  if (leagueIds && leagueIds.length > 0) where.push(inArray(activityFootballMatches.leagueId, leagueIds));
  return db
    .select()
    .from(activityFootballMatches)
    .where(and(...where))
    .orderBy(asc(activityFootballMatches.kickoffUtc))
    .limit(2000);
}

export interface FootballStatus {
  configured: boolean;
  plan: string | null;
  requestsUsed: number | null;
  requestsLimit: number | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  quotaLow: boolean;
  /**
   * Paket gratis penyedia jadwal mewajibkan atribusi (syarat lisensi). Nama penyedia hanya tampil saat
   * paketnya gratis; env FOOTBALL_DATA_ATTRIBUTION=off menyembunyikannya (tanggung jawab pemilik akun).
   */
  attributionRequired: boolean;
}

export async function footballStatus(): Promise<FootballStatus> {
  const st = await readState(STATE_MATCHES);
  const s = parseJson<FootballState>(st?.payload) ?? { plan: null, requestsUsed: null, requestsLimit: null };
  const errorIsLatest = !!st?.lastErrorAt && (!st.lastSuccessAt || st.lastErrorAt >= st.lastSuccessAt);
  return {
    configured: footballConfigured(),
    plan: s.plan,
    requestsUsed: s.requestsUsed,
    requestsLimit: s.requestsLimit,
    lastSuccessAt: st?.lastSuccessAt ?? null,
    lastError: errorIsLatest ? st?.lastError ?? null : null,
    lastErrorAt: errorIsLatest ? st?.lastErrorAt ?? null : null,
    quotaLow: quotaLow(s),
    attributionRequired: (s.plan ?? "").toLowerCase() === "free" && (process.env.FOOTBALL_DATA_ATTRIBUTION ?? "").toLowerCase() !== "off",
  };
}

export async function footballDue(): Promise<boolean> {
  if (!footballConfigured()) return false;
  const st = await readState(STATE_MATCHES);
  return footballNeedsSync(st?.lastSuccessAt ?? null, st?.lastAttemptAt ?? null, st?.lastErrorAt ?? null);
}
