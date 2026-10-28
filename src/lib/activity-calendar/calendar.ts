/**
 * Menyusun data Kalender Bisnis untuk satu outlet: cuaca (prakiraan + arsip), pertandingan (liga pilihan,
 * jam lokal outlet), angka aktual, prediksi baseline, dan analisis korelasi berlabel. Dipakai
 * /api/activity-calendar. Hanya membaca cache/DB — pengambilan dari API luar ada di sync/bmkg/football.
 */
import { archivedDays, getWeather } from "./bmkg";
import { rainLevelOf, rainyDuringOpenHours, type RainLevel, type WeatherSlot } from "./bmkg-rules";
import { dailyActuals, hourlySessions, type ActivitySettings } from "./data";
import { cachedLeagues, footballStatus, storedMatches } from "./football";
import { isPrimeTime, kickoffBucket, localDateOf, localHourOf, localTimeOf, mapStatus, sortLeagues, type KickoffBucket, type MatchStatus } from "./football-rules";
import { addDays, baselineFor, compareGroups, directionOf, METRICS, type Baseline, type DailyActual, type Direction, type GroupComparison } from "./insights-rules";

export const MAX_RANGE_DAYS = 62;
export const ANALYSIS_DAYS = 90;

export interface CalendarMatch {
  matchId: string;
  leagueId: string | null;
  leagueName: string | null;
  country: string | null;
  kickoffUtc: string;
  localDate: string;
  localTime: string;
  bucket: KickoffBucket;
  status: MatchStatus;
  rawStatus: string | null;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string | null;
  awayLogo: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
}

export interface CalendarWeatherDay {
  date: string;
  /** forecast = prakiraan BMKG terbaru; archive = arsip prakiraan (hari yang sudah lewat). */
  source: "forecast" | "archive";
  rainSlots: number;
  worstRain: RainLevel;
  rainHours: number[];
  precipTotal: number | null;
  tempMin: number | null;
  tempMax: number | null;
  sky: string | null;
}

export interface Next7Day {
  date: string;
  weather: CalendarWeatherDay | null;
  matches: number;
  primeTimeMatches: number;
  firstPrimeKickoff: string | null;
  baseline: Baseline | null;
}

export interface AnalysisBlock {
  /** Hari yang punya data kondisi (arsip cuaca / cakupan jadwal) dalam jendela analisis. */
  coveredDays: number;
  comparisons: (GroupComparison & { direction: Direction })[];
}

/** Tanggal lokal hari ini di zona waktu outlet. */
export function todayIn(tz: string): string {
  return localDateOf(new Date().toISOString(), tz);
}

export function validDate(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

function toMatch(r: Awaited<ReturnType<typeof storedMatches>>[number], tz: string): CalendarMatch {
  return {
    matchId: r.matchId,
    leagueId: r.leagueId,
    leagueName: r.leagueName,
    country: r.country,
    kickoffUtc: r.kickoffUtc,
    localDate: localDateOf(r.kickoffUtc, tz),
    localTime: localTimeOf(r.kickoffUtc, tz),
    bucket: kickoffBucket(localHourOf(r.kickoffUtc, tz)),
    status: mapStatus(r.status),
    rawStatus: r.status,
    homeTeam: r.homeTeam,
    awayTeam: r.awayTeam,
    homeLogo: r.homeLogo,
    awayLogo: r.awayLogo,
    scoreHome: r.scoreHome,
    scoreAway: r.scoreAway,
  };
}

function utcRange(fromDate: string, toDate: string) {
  return { fromUtc: `${addDays(fromDate, -1)}T00:00:00.000Z`, toUtc: `${addDays(toDate, 2)}T00:00:00.000Z` };
}

export async function buildCalendar(outletId: string, settings: ActivitySettings, fromDate: string, toDate: string, opts: { day?: string | null } = {}) {
  const tz = settings.timezone;
  const today = todayIn(tz);

  /* ---------------- cuaca ---------------- */
  const weather = settings.adm4Code ? await getWeather(settings.adm4Code) : null;
  const snap = weather?.snapshot ?? null;
  const forecastDays = new Map((snap?.days ?? []).map((d) => [d.date, d]));
  const weatherDays: CalendarWeatherDay[] = [];
  const archiveFrom = addDays(today, -ANALYSIS_DAYS);
  const archive = settings.adm4Code ? await archivedDays(settings.adm4Code, fromDate < archiveFrom ? fromDate : archiveFrom, toDate) : [];
  const archiveByDate = new Map(archive.map((a) => [a.localDate, a]));
  for (let d = fromDate; d <= toDate; d = addDays(d, 1)) {
    const f = forecastDays.get(d);
    if (f && d >= today) {
      weatherDays.push({ date: d, source: "forecast", rainSlots: f.rainSlots, worstRain: f.worstRain, rainHours: f.rainHours, precipTotal: f.precipTotal, tempMin: f.tempMin, tempMax: f.tempMax, sky: f.sky });
      continue;
    }
    const a = archiveByDate.get(d);
    if (a) {
      const hours = (a.rainHours ?? "").split(",").filter(Boolean).map(Number);
      weatherDays.push({
        date: d,
        source: "archive",
        rainSlots: a.rainSlots,
        worstRain: a.rainSlots > 0 ? rainLevelOf(a.mainCode, "", "", a.precipMax) : "none",
        rainHours: hours,
        precipTotal: a.precipTotal,
        tempMin: a.tempMin,
        tempMax: a.tempMax,
        sky: null,
      });
    }
  }
  const slots: WeatherSlot[] = (snap?.slots ?? []).filter((s) => s.date >= fromDate && s.date <= toDate);

  /* ---------------- pertandingan ---------------- */
  const { fromUtc, toUtc } = utcRange(fromDate, toDate);
  const leagueFilter = settings.leagueIds;
  const matchRows = settings.showMatches ? await storedMatches(fromUtc, toUtc, leagueFilter) : [];
  const matches = matchRows.map((r) => toMatch(r, tz)).filter((m) => m.localDate >= fromDate && m.localDate <= toDate);

  /* ---------------- aktual & analisis ---------------- */
  const analysisFrom = addDays(today, -ANALYSIS_DAYS);
  const actualsAll = await dailyActuals(outletId, fromDate < analysisFrom ? fromDate : analysisFrom, today, tz);
  const actuals = actualsAll.filter((a) => a.date >= fromDate && a.date <= toDate);
  const history = actualsAll.filter((a) => a.date >= analysisFrom && a.date < today);

  // Hari hujan menurut ARSIP prakiraan (bukan observasi) — hanya tanggal yang punya arsip.
  const rainFlags = new Map<string, boolean>();
  for (const a of archive) if (a.localDate >= analysisFrom && a.localDate < today) rainFlags.set(a.localDate, rainyDuringOpenHours((a.rainHours ?? "").split(",").filter(Boolean).map(Number)));

  // Hari dengan pertandingan jam tayang sore–malam (liga pilihan) — hanya tanggal yang tercakup sinkron.
  const histMatches = settings.showMatches ? (await storedMatches(`${analysisFrom}T00:00:00.000Z`, `${today}T00:00:00.000Z`, leagueFilter)).map((r) => toMatch(r, tz)) : [];
  const matchFlags = new Map<string, boolean>();
  if (histMatches.length > 0) {
    const firstCovered = histMatches.reduce((min, m) => (m.localDate < min ? m.localDate : min), histMatches[0].localDate);
    const prime = new Set(histMatches.filter((m) => isPrimeTime(Number(m.localTime.slice(0, 2)))).map((m) => m.localDate));
    for (let d = firstCovered; d < today; d = addDays(d, 1)) matchFlags.set(d, prime.has(d));
  }
  const analyse = (flags: Map<string, boolean>): AnalysisBlock => ({
    coveredDays: flags.size,
    comparisons: METRICS.map((m) => {
      const c = compareGroups(history, flags, m);
      return { ...c, direction: directionOf(c) };
    }),
  });

  /* ---------------- 7 hari ke depan ---------------- */
  const nextMatchesRows = settings.showMatches ? await storedMatches(`${addDays(today, -1)}T00:00:00.000Z`, `${addDays(today, 8)}T00:00:00.000Z`, leagueFilter) : [];
  const nextMatches = nextMatchesRows.map((r) => toMatch(r, tz));
  const next7: Next7Day[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const f = forecastDays.get(d);
    const dayMatches = nextMatches.filter((m) => m.localDate === d);
    const prime = dayMatches.filter((m) => isPrimeTime(Number(m.localTime.slice(0, 2)))).sort((a, b) => a.localTime.localeCompare(b.localTime));
    next7.push({
      date: d,
      weather: f ? { date: d, source: "forecast", rainSlots: f.rainSlots, worstRain: f.worstRain, rainHours: f.rainHours, precipTotal: f.precipTotal, tempMin: f.tempMin, tempMax: f.tempMax, sky: f.sky } : null,
      matches: dayMatches.length,
      primeTimeMatches: prime.length,
      firstPrimeKickoff: prime[0]?.localTime ?? null,
      baseline: baselineFor(d, today, history),
    });
  }

  const [fStatus, leagues] = await Promise.all([footballStatus(), cachedLeagues()]);

  return {
    today,
    timezone: tz,
    range: { from: fromDate, to: toDate },
    weather: {
      configured: !!settings.adm4Code,
      location: snap?.location ?? null,
      locationLabel: settings.locationLabel,
      analysisDate: snap?.analysisDate ?? null,
      fetchedAt: weather?.fetchedAt ?? null,
      stale: weather?.stale ?? false,
      error: weather?.error ?? null,
      errorAt: weather?.errorAt ?? null,
      forecastUntil: snap?.days.at(-1)?.date ?? null,
      days: weatherDays,
      slots,
    },
    football: {
      status: fStatus,
      leagues: sortLeagues(leagues),
      matches,
    },
    actuals,
    hourly: opts.day && validDate(opts.day) ? { date: opts.day, sessions: await hourlySessions(outletId, opts.day, tz) } : null,
    insights: {
      next7,
      rainyDays: next7.filter((d) => d.weather && d.weather.rainSlots > 0).length,
      forecastDays: next7.filter((d) => d.weather).length,
      matches: next7.reduce((s, d) => s + d.matches, 0),
      primeTimeMatches: next7.reduce((s, d) => s + d.primeTimeMatches, 0),
      historyDays: history.filter((a) => a.sessions > 0 || a.revenue > 0).length,
      rain: analyse(rainFlags),
      match: analyse(matchFlags),
    },
  };
}

export type CalendarPayload = Awaited<ReturnType<typeof buildCalendar>>;
export type { DailyActual };
