/**
 * Normalisasi jadwal sepak bola dari Footballdata.io (aturan murni — diuji di football-rules.test.ts).
 *
 * Sumber: https://footballdata.io/documentation/ — base https://footballdata.io/api/v1, header
 * "Authorization: Bearer <key>". Dipakai: GET /leagues (liga yang tersedia di paket key), GET /matches
 * ?from&to&page&limit (jadwal + hasil). Respons: { success, data, meta: { plan, requests_used,
 * requests_limit, pagination? } }. Contoh di dokumentasi memakai `data` berupa array maupun
 * `data.matches`, jadi keduanya diterima. Kuota per BULAN (Free 2.000, 5 liga; Starter 100.000, 50 liga;
 * Pro 300.000, 150 liga — Liga 1 Indonesia hanya mulai paket Pro). 429 = kuota bulanan habis.
 * Paket Free mewajibkan atribusi.
 */

export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled" | "unknown";

export interface FootballMatch {
  matchId: string;
  leagueId: string | null;
  leagueName: string | null;
  country: string | null;
  seasonId: string | null;
  kickoffUtc: string;
  status: MatchStatus;
  rawStatus: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
}

export interface FootballLeague {
  leagueId: string;
  name: string;
  country: string | null;
  image: string | null;
}

export interface ApiMeta {
  plan: string | null;
  requestsUsed: number | null;
  requestsLimit: number | null;
  page: number | null;
  totalPages: number | null;
}

const obj = (v: unknown): Record<string, unknown> | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" && Number.isFinite(v) ? String(v) : null);
const int = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export function mapStatus(raw: string | null): MatchStatus {
  const s = (raw ?? "").toLowerCase().replace(/[\s_-]+/g, "");
  if (!s) return "unknown";
  if (["scheduled", "notstarted", "ns", "incomplete", "upcoming", "fixture", "timed"].includes(s)) return "scheduled";
  if (["live", "inplay", "inprogress", "1h", "2h", "ht", "halftime", "extratime", "penalties", "playing"].includes(s)) return "live";
  if (["complete", "completed", "finished", "ft", "fulltime", "aet", "ended", "result"].includes(s)) return "finished";
  if (["postponed", "suspended", "delayed", "interrupted"].includes(s)) return "postponed";
  if (["cancelled", "canceled", "abandoned", "awarded"].includes(s)) return "cancelled";
  return "unknown";
}

/**
 * Satu objek pertandingan → FootballMatch. Pertandingan tanpa id, tim, atau waktu kick-off (date_unix)
 * dibuang — lebih baik tidak tampil daripada menampilkan jam yang salah.
 */
export function normalizeMatch(raw: unknown): FootballMatch | null {
  const m = obj(raw);
  if (!m) return null;
  const matchId = str(m.match_id ?? m.id);
  const home = obj(m.home_team);
  const away = obj(m.away_team);
  const homeTeam = str(home?.team_name ?? home?.name ?? m.home_name);
  const awayTeam = str(away?.team_name ?? away?.name ?? m.away_name);
  const unix = int(m.date_unix ?? m.timestamp);
  if (!matchId || !homeTeam || !awayTeam || unix == null || unix <= 0) return null;
  const kickoff = new Date(unix * 1000);
  if (Number.isNaN(kickoff.getTime())) return null;
  const league = obj(m.league);
  const season = obj(m.season);
  const score = obj(m.score);
  const rawStatus = str(m.status);
  return {
    matchId,
    leagueId: str(league?.league_id ?? m.league_id),
    leagueName: str(league?.competition_name ?? league?.name ?? league?.league_name),
    country: str(league?.country),
    seasonId: str(season?.season_id ?? m.season_id),
    kickoffUtc: kickoff.toISOString(),
    status: mapStatus(rawStatus),
    rawStatus,
    homeTeam,
    awayTeam,
    homeLogo: str(home?.team_logo ?? home?.logo),
    awayLogo: str(away?.team_logo ?? away?.logo),
    scoreHome: int(score?.home),
    scoreAway: int(score?.away),
  };
}

/** Daftar dari `data` (array) atau `data.matches`/`data.items`/`data.data`. */
export function extractList(json: unknown): unknown[] {
  const root = obj(json);
  const data = root?.data;
  if (Array.isArray(data)) return data;
  const d = obj(data);
  for (const k of ["matches", "items", "data", "leagues", "results"]) if (Array.isArray(d?.[k])) return d![k] as unknown[];
  return [];
}

export function extractMeta(json: unknown): ApiMeta {
  const root = obj(json);
  const meta = obj(root?.meta);
  const pag = obj(meta?.pagination) ?? obj(root?.pagination);
  return {
    plan: str(meta?.plan),
    requestsUsed: int(meta?.requests_used),
    requestsLimit: int(meta?.requests_limit),
    page: int(pag?.page),
    totalPages: int(pag?.total_pages),
  };
}

export function normalizeLeague(raw: unknown): FootballLeague | null {
  const l = obj(raw);
  const leagueId = str(l?.league_id ?? l?.id);
  const name = str(l?.league_name ?? l?.name ?? l?.competition_name);
  if (!leagueId || !name) return null;
  const image = str(l?.league_image ?? l?.image);
  return { leagueId, name, country: str(l?.country), image };
}

/** Urutan tampil liga: Indonesia dulu, lalu Asia/Internasional, lalu sisanya per nama. */
export function leaguePriority(country: string | null): number {
  const c = (country ?? "").toLowerCase();
  if (c === "indonesia") return 0;
  if (["asia", "international", "world"].includes(c)) return 1;
  if (["europe", "england", "spain", "italy", "germany", "france"].includes(c)) return 2;
  return 3;
}

export function sortLeagues<T extends { country: string | null; name: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => leaguePriority(a.country) - leaguePriority(b.country) || a.name.localeCompare(b.name));
}

export function hasIndonesianLeague(leagues: FootballLeague[]): boolean {
  return leagues.some((l) => (l.country ?? "").toLowerCase() === "indonesia");
}

/* ------------------------------------------------------------ waktu lokal outlet ------------------------------------------------------------ */

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function parts(date: Date, tz: string) {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    fmtCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, minute: Number(p.minute) };
}

/** Tanggal lokal (YYYY-MM-DD) dari waktu UTC di zona waktu outlet. */
export function localDateOf(utcIso: string, tz: string): string {
  return parts(new Date(utcIso), tz).date;
}

/** "HH:mm" lokal. */
export function localTimeOf(utcIso: string, tz: string): string {
  const p = parts(new Date(utcIso), tz);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}

export function localHourOf(utcIso: string, tz: string): number {
  return parts(new Date(utcIso), tz).hour;
}

export type KickoffBucket = "morning" | "afternoon" | "evening" | "late_night";

/** Pagi 05–11, siang/sore 12–17, malam 18–23, dini hari 00–04 (waktu lokal outlet). */
export function kickoffBucket(localHour: number): KickoffBucket {
  if (localHour >= 18) return "evening";
  if (localHour < 5) return "late_night";
  if (localHour < 12) return "morning";
  return "afternoon";
}

/** Pertandingan yang tayang saat jam buka umum rental (sore–malam) — dipakai untuk analisis. */
export function isPrimeTime(localHour: number): boolean {
  return localHour >= 15 && localHour <= 23;
}

/* ------------------------------------------------------------ kuota ------------------------------------------------------------ */

/** Jarak minimal antar-sinkron otomatis. Free 2.000/bulan: 4×/hari × ±3 halaman ≈ 360/bulan. */
export const FOOTBALL_SYNC_EVERY_MS = 6 * 3600_000;
export const FOOTBALL_LEAGUES_EVERY_MS = 24 * 3600_000;
export const FOOTBALL_RETRY_AFTER_FAIL_MS = 30 * 60_000;
/** Maksimal halaman per sinkron (limit 100/halaman) — rem keras pemakaian kuota. */
export const FOOTBALL_MAX_PAGES = 5;
/** Sisa kuota di bawah ini → sinkron otomatis berhenti, hanya sinkron manual. */
export const FOOTBALL_MIN_REMAINING = 60;
/** Jendela sinkron: 7 hari lalu (hasil) s.d. 30 hari ke depan (jadwal). */
export const FOOTBALL_PAST_DAYS = 7;
export const FOOTBALL_FUTURE_DAYS = 30;
/** Sinkron pertama mengambil riwayat lebih panjang untuk analisis hari pertandingan. */
export const FOOTBALL_BACKFILL_DAYS = 60;

export function footballNeedsSync(lastSuccessAt: string | null, lastAttemptAt: string | null, lastErrorAt: string | null, now = Date.now()): boolean {
  if (lastErrorAt && lastAttemptAt && lastErrorAt >= lastAttemptAt && now - new Date(lastAttemptAt).getTime() < FOOTBALL_RETRY_AFTER_FAIL_MS) return false;
  if (!lastSuccessAt) return true;
  return now - new Date(lastSuccessAt).getTime() > FOOTBALL_SYNC_EVERY_MS;
}

export function quotaLow(meta: { requestsUsed: number | null; requestsLimit: number | null } | null): boolean {
  if (!meta || meta.requestsUsed == null || meta.requestsLimit == null) return false;
  return meta.requestsLimit - meta.requestsUsed < FOOTBALL_MIN_REMAINING;
}

/** YYYY-MM-DD (UTC) digeser n hari dari `now`. */
export function isoDateOffset(now: Date, days: number): string {
  return new Date(now.getTime() + days * 86400_000).toISOString().slice(0, 10);
}
