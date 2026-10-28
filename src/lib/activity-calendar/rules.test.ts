import { describe, expect, it } from "vitest";
import { isValidAdm4, parseBmkgResponse, rainLevelOf, rainyDuringOpenHours, timezoneFromBmkg, weatherNeedsRefresh } from "./bmkg-rules";
import { extractList, extractMeta, footballNeedsSync, kickoffBucket, localDateOf, localTimeOf, mapStatus, normalizeMatch, quotaLow, sortLeagues } from "./football-rules";
import { baselineFor, compareGroups, directionOf, weekdayOf, type DailyActual } from "./insights-rules";

/** Potongan respons BMKG asli (adm4 31.71.03.1001, 2026-10-28). */
const BMKG_SAMPLE = {
  lokasi: { adm4: "31.71.03.1001", provinsi: "DKI Jakarta", kotkab: "Kota Adm. Jakarta Pusat", kecamatan: "Kemayoran", desa: "Kemayoran", lon: 106.84, lat: -6.16, timezone: "Asia/Jakarta" },
  data: [
    {
      lokasi: { adm4: "31.71.03.1001", timezone: "+0700", type: "adm4" },
      cuaca: [
        [
          { datetime: "2026-10-28T12:00:00Z", t: 25, tcc: 100, tp: 1.8, weather: 61, weather_desc: "Hujan Ringan", weather_desc_en: "Light Rain", ws: 1.8, wd: "S", hu: 92, analysis_date: "2026-10-28T00:00:00", local_datetime: "2026-10-28 19:00:00" },
          { datetime: "2026-10-28T15:00:00Z", t: 25, tcc: 100, tp: 2, weather: 61, weather_desc: "Hujan Ringan", weather_desc_en: "Light Rain", ws: 3.3, wd: "S", hu: 93, analysis_date: "2026-10-28T00:00:00", local_datetime: "2026-10-28 22:00:00" },
        ],
        [
          { datetime: "2026-10-29T03:00:00Z", t: 29, tcc: 81, tp: 0, weather: 2, weather_desc: "Cerah Berawan", weather_desc_en: "Partly Cloudy", ws: 1.2, wd: "W", hu: 74, analysis_date: "2026-10-28T00:00:00", local_datetime: "2026-10-29 10:00:00" },
          { datetime: "2026-10-29T09:00:00Z", t: 28, tcc: 99, tp: 1.2, weather: 95, weather_desc: "Hujan Petir", weather_desc_en: "Thunderstorm", ws: 4.7, wd: "W", hu: 81, analysis_date: "2026-10-28T00:00:00", local_datetime: "2026-10-29 16:00:00" },
          { datetime: "2026-10-29T09:00:00Z", t: 28, weather: 95, weather_desc: "Hujan Petir", local_datetime: "2026-10-29 16:00:00" },
          { datetime: "bukan tanggal", local_datetime: "2026-10-29 19:00:00" },
        ],
      ],
    },
  ],
};

describe("BMKG", () => {
  it("validasi kode wilayah tingkat IV", () => {
    expect(isValidAdm4("31.71.03.1001")).toBe(true);
    expect(isValidAdm4("31.71.03")).toBe(false);
    expect(isValidAdm4("31.71.03.1001; drop")).toBe(false);
  });
  it("parse respons asli: slot, ringkasan harian, zona waktu, waktu analisis", () => {
    const s = parseBmkgResponse(BMKG_SAMPLE, "31.71.03.1001");
    expect(s.timezone).toBe("Asia/Jakarta");
    expect(s.analysisDate).toBe("2026-10-28T00:00:00.000Z");
    expect(s.slots).toHaveLength(4); // duplikat & slot rusak dibuang
    expect(s.location.desa).toBe("Kemayoran");
    const [d1, d2] = s.days;
    expect(d1).toMatchObject({ date: "2026-10-28", rainSlots: 2, precipTotal: 3.8, worstRain: "light", rainHours: [19, 22] });
    expect(d2).toMatchObject({ date: "2026-10-29", rainSlots: 1, worstRain: "thunder", sky: "thunder", tempMax: 29 });
  });
  it("format tak dikenal dilempar sebagai error, bukan data kosong diam-diam", () => {
    expect(() => parseBmkgResponse({ data: [] }, "31.71.03.1001")).toThrow();
    expect(() => parseBmkgResponse(null, "31.71.03.1001")).toThrow();
  });
  it("tingkat hujan & zona waktu", () => {
    expect(rainLevelOf(3, "Berawan", "Mostly Cloudy", 0)).toBe("none");
    expect(rainLevelOf(63, "Hujan Lebat", "Heavy Rain", 12)).toBe("heavy");
    expect(rainLevelOf(61, "Hujan Sedang", "", null)).toBe("moderate");
    expect(timezoneFromBmkg(undefined, "+0800")).toBe("Asia/Makassar");
    expect(timezoneFromBmkg("Asia/Jayapura", "+0700")).toBe("Asia/Jayapura");
    expect(rainyDuringOpenHours([1, 4])).toBe(false);
    expect(rainyDuringOpenHours([16])).toBe(true);
  });
  it("refresh: segar 3 jam, jeda 10 menit setelah gagal", () => {
    const now = Date.parse("2026-10-28T12:00:00Z");
    expect(weatherNeedsRefresh(null, null, null, now)).toBe(true);
    expect(weatherNeedsRefresh("2026-10-28T10:00:00Z", null, null, now)).toBe(false);
    expect(weatherNeedsRefresh("2026-10-28T08:00:00Z", null, null, now)).toBe(true);
    expect(weatherNeedsRefresh("2026-10-28T08:00:00Z", "2026-10-28T11:55:00Z", "2026-10-28T11:55:01Z", now)).toBe(false);
  });
});

describe("Footballdata.io", () => {
  const raw = {
    match_id: 12345,
    match_date: "2026-11-01",
    date_unix: Date.parse("2026-11-01T20:00:00Z") / 1000,
    status: "scheduled",
    league: { league_id: 10, name: "England Premier League", country: "England", competition_name: "Premier League" },
    season: { season_id: 100, year: 20262027 },
    home_team: { team_id: 1, team_name: "Arsenal", team_logo: "https://x/a.png" },
    away_team: { team_id: 2, team_name: "Chelsea" },
    score: { home: null, away: null },
  };
  it("normalisasi pertandingan; tanpa waktu kick-off dibuang (tidak mengarang jam)", () => {
    const m = normalizeMatch(raw)!;
    expect(m).toMatchObject({ matchId: "12345", leagueId: "10", leagueName: "Premier League", status: "scheduled", homeTeam: "Arsenal", awayTeam: "Chelsea", scoreHome: null });
    expect(m.kickoffUtc).toBe("2026-11-01T20:00:00.000Z");
    expect(normalizeMatch({ ...raw, date_unix: undefined })).toBeNull();
    expect(normalizeMatch({ ...raw, home_team: {} })).toBeNull();
  });
  it("kick-off di zona waktu outlet (WIB/WITA/WIT) — bisa pindah tanggal", () => {
    expect(localDateOf("2026-11-01T20:00:00.000Z", "Asia/Jakarta")).toBe("2026-11-02");
    expect(localTimeOf("2026-11-01T20:00:00.000Z", "Asia/Jakarta")).toBe("03:00");
    expect(localTimeOf("2026-11-01T20:00:00.000Z", "Asia/Makassar")).toBe("04:00");
    expect(localTimeOf("2026-11-01T12:00:00.000Z", "Asia/Jayapura")).toBe("21:00");
    expect(kickoffBucket(3)).toBe("late_night");
    expect(kickoffBucket(19)).toBe("evening");
  });
  it("status & bentuk respons (array maupun data.matches)", () => {
    expect(mapStatus("complete")).toBe("finished");
    expect(mapStatus("In Play")).toBe("live");
    expect(mapStatus("postponed")).toBe("postponed");
    expect(mapStatus("aneh")).toBe("unknown");
    expect(extractList({ data: [raw] })).toHaveLength(1);
    expect(extractList({ data: { matches: [raw, raw] } })).toHaveLength(2);
    expect(extractList({ success: false })).toHaveLength(0);
    expect(extractMeta({ meta: { plan: "free", requests_used: 1950, requests_limit: 2000, pagination: { page: 1, total_pages: 3 } } })).toEqual({
      plan: "free",
      requestsUsed: 1950,
      requestsLimit: 2000,
      page: 1,
      totalPages: 3,
    });
  });
  it("liga Indonesia diprioritaskan; rem kuota & jadwal sinkron", () => {
    const sorted = sortLeagues([
      { name: "Premier League", country: "England" },
      { name: "Liga 1", country: "Indonesia" },
      { name: "World Cup", country: "International" },
    ]);
    expect(sorted.map((l) => l.name)).toEqual(["Liga 1", "World Cup", "Premier League"]);
    expect(quotaLow({ requestsUsed: 1950, requestsLimit: 2000 })).toBe(true);
    expect(quotaLow({ requestsUsed: 100, requestsLimit: 2000 })).toBe(false);
    const now = Date.parse("2026-10-28T12:00:00Z");
    expect(footballNeedsSync(null, null, null, now)).toBe(true);
    expect(footballNeedsSync("2026-10-28T09:00:00Z", null, null, now)).toBe(false);
    expect(footballNeedsSync("2026-10-28T05:00:00Z", null, null, now)).toBe(true);
  });
});

describe("insight", () => {
  // 8 minggu data: Sabtu ramai, hari lain biasa.
  const actuals: DailyActual[] = [];
  for (let i = 1; i <= 56; i++) {
    const d = new Date(Date.parse("2026-10-28T12:00:00Z") - i * 86400_000).toISOString().slice(0, 10);
    const sat = weekdayOf(d) === 6;
    actuals.push({ date: d, sessions: sat ? 40 : 20, revenue: sat ? 800000 : 400000, avgDurationMin: 90 });
  }
  it("baseline = rata-rata hari yang sama dalam seminggu", () => {
    const b = baselineFor("2026-10-31", "2026-10-28", actuals)!; // Sabtu
    expect(b).toMatchObject({ sessions: 40, revenue: 800000, n: 8 });
    expect(baselineFor("2026-10-31", "2026-10-28", actuals.slice(0, 10))).toBeNull();
  });
  it("perbandingan dinormalkan per hari: hujan yang jatuh di Sabtu tidak dianggap efek hujan", () => {
    const flags = new Map(actuals.map((a) => [a.date, weekdayOf(a.date) === 6]));
    const c = compareGroups(actuals, flags, "sessions");
    expect(c.enough).toBe(true);
    expect(c.diffPct).toBe(0);
    expect(directionOf(c)).toBe("similar");
  });
  it("sampel kurang → tidak ada kesimpulan", () => {
    const flags = new Map(actuals.slice(0, 3).map((a) => [a.date, true]));
    const c = compareGroups(actuals, flags, "revenue");
    expect(c.enough).toBe(false);
    expect(directionOf(c)).toBe("insufficient");
  });
});

describe("integrasi paket & input", () => {
  it("Kalender Bisnis dikunci paket Pro (halaman & API)", async () => {
    const { featureForApiRequest, featureForDashboardPath, TIER_FEATURES } = await import("@/lib/subscription/pricing");
    expect(featureForDashboardPath("/dashboard/kalender-bisnis")).toBe("activity_calendar");
    expect(featureForApiRequest("/api/activity-calendar/settings", "PUT")).toBe("activity_calendar");
    expect(TIER_FEATURES.pro).toContain("activity_calendar");
    expect(TIER_FEATURES.starter).not.toContain("activity_calendar");
  });
  it("pemilih wilayah hanya menerima kode berformat benar (tidak bisa dipakai untuk path lain)", async () => {
    const { validWilayahRequest } = await import("./wilayah");
    expect(validWilayahRequest("provinces", null)).toBe(true);
    expect(validWilayahRequest("regencies", "31")).toBe(true);
    expect(validWilayahRequest("villages", "31.71.03")).toBe(true);
    expect(validWilayahRequest("villages", "../../etc")).toBe(false);
    expect(validWilayahRequest("districts", "31")).toBe(false);
    expect(validWilayahRequest("other", "31")).toBe(false);
  });
});
