/**
 * Sinkron jadwal liga utama Indonesia dari situs resmi operator liga (ligaindonesiabaru.com) — lihat
 * lib-rules.ts untuk alasan pemilihan sumber dan struktur halamannya. Hanya JADWAL: tanggal, jam kick-off,
 * tim, stadion. Sopan ke server sumber: tiap 12 jam, ±7 halaman per sinkron, jeda 1,5 detik antar-halaman,
 * User-Agent yang jelas. Disimpan ke activity_football_matches (league_id "id-super-league") sehingga ikut
 * semua tampilan & analisis Kalender Bisnis. Matikan dengan env LIB_SCHEDULE=off.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { activityFootballMatches, activitySyncState } from "@/db/schema";
import { fetchText, HttpJsonError } from "./http";
import {
  competitionLabel,
  LIB_COUNTRY,
  LIB_LEAGUE_ID,
  LIB_REQUEST_GAP_MS,
  LIB_WEEKS_AFTER,
  LIB_WEEKS_BEFORE,
  libNeedsSync,
  parseCurrentWeek,
  parseFixturesPage,
  type LibFixture,
} from "./lib-rules";

const BASE = (process.env.LIB_SCHEDULE_URL || "https://www.ligaindonesiabaru.com").replace(/\/$/, "");
const STATE_KEY = "lib_super_league";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function libEnabled(): boolean {
  return (process.env.LIB_SCHEDULE ?? "on").toLowerCase() !== "off";
}

export interface LibState {
  competition: string | null;
  week: number | null;
  lastCount?: number;
}

async function readState() {
  const [row] = await db.select().from(activitySyncState).where(eq(activitySyncState.key, STATE_KEY)).limit(1);
  return row ?? null;
}

async function writeState(patch: Partial<typeof activitySyncState.$inferInsert>) {
  const now = new Date().toISOString();
  await db.insert(activitySyncState).values({ key: STATE_KEY, ...patch, updatedAt: now }).onConflictDoUpdate({ target: activitySyncState.key, set: { ...patch, updatedAt: now } });
}

/** Liga untuk pemilih liga di pengaturan (selalu paling atas). */
export async function libLeague(): Promise<{ leagueId: string; name: string; country: string; image: string | null } | null> {
  if (!libEnabled()) return null;
  const st = await readState().catch(() => null);
  let competition: string | null = null;
  try {
    competition = st?.payload ? (JSON.parse(st.payload) as LibState).competition : null;
  } catch {
    competition = null;
  }
  return { leagueId: LIB_LEAGUE_ID, name: competition ? competitionLabel(competition) : "BRI Super League", country: LIB_COUNTRY, image: null };
}

export async function libDue(): Promise<boolean> {
  if (!libEnabled()) return false;
  const st = await readState();
  return libNeedsSync(st?.lastSuccessAt ?? null, st?.lastAttemptAt ?? null, st?.lastErrorAt ?? null);
}

export async function libLastSuccessAt(): Promise<string | null> {
  return (await readState().catch(() => null))?.lastSuccessAt ?? null;
}

let running: Promise<{ ok: boolean; count: number; error?: string }> | null = null;

export async function syncLibSchedule(): Promise<{ ok: boolean; count: number; error?: string }> {
  if (!libEnabled()) return { ok: false, count: 0, error: "nonaktif" };
  if (running) return running;
  running = (async () => {
    const now = new Date().toISOString();
    try {
      const home = await fetchText(`${BASE}/`, { label: "Jadwal liga Indonesia", timeoutMs: 12_000 });
      const cur = parseCurrentWeek(home);
      if (!cur) throw new Error("Pekan berjalan tidak ditemukan di beranda situs liga (struktur halaman berubah?).");
      const fixtures: LibFixture[] = [];
      for (let w = Math.max(1, cur.week - LIB_WEEKS_BEFORE); w <= cur.week + LIB_WEEKS_AFTER; w++) {
        await sleep(LIB_REQUEST_GAP_MS);
        try {
          const html = await fetchText(`${BASE}/fixtures/index/${encodeURIComponent(cur.competition)}/${w}/0`, { label: "Jadwal liga Indonesia", timeoutMs: 12_000 });
          fixtures.push(...parseFixturesPage(html));
        } catch (err) {
          // Pekan terakhir musim bisa belum ada — lanjut ke pekan lain.
          if (!(err instanceof HttpJsonError && err.status === 404)) throw err;
        }
      }
      const count = await saveFixtures(fixtures, cur.competition);
      await writeState({
        payload: JSON.stringify({ competition: cur.competition, week: cur.week, lastCount: count } satisfies LibState),
        lastSuccessAt: now,
        lastAttemptAt: now,
        lastError: null,
        lastErrorAt: null,
      });
      return { ok: true, count };
    } catch (err) {
      const msg = err instanceof HttpJsonError ? (err.status ? `Situs jadwal liga membalas HTTP ${err.status}.` : "Situs jadwal liga tidak dapat dihubungi.") : err instanceof Error ? err.message : "Gagal mengambil jadwal liga.";
      console.warn(`[activity-calendar] jadwal liga Indonesia: ${msg}`);
      await writeState({ lastAttemptAt: now, lastError: msg, lastErrorAt: now }).catch(() => undefined);
      return { ok: false, count: 0, error: msg };
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

/**
 * Simpan: laga dengan jam kick-off → upsert. Laga selesai (halaman tidak menulis jam) → hanya menandai
 * baris yang SUDAH ada sebagai selesai; tidak membuat baris baru dengan jam tebakan.
 */
async function saveFixtures(list: LibFixture[], competition: string): Promise<number> {
  const now = new Date().toISOString();
  const name = competitionLabel(competition);
  let n = 0;
  for (const f of list) {
    if (f.kickoffUtc) {
      const row = {
        leagueId: LIB_LEAGUE_ID,
        leagueName: name,
        country: LIB_COUNTRY,
        seasonId: competition,
        kickoffUtc: f.kickoffUtc,
        status: f.finished ? "finished" : "scheduled",
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        homeLogo: null,
        awayLogo: null,
        scoreHome: null,
        scoreAway: null,
        updatedAt: now,
      };
      await db.insert(activityFootballMatches).values({ matchId: f.matchId, ...row }).onConflictDoUpdate({ target: activityFootballMatches.matchId, set: row });
      n++;
    }
  }
  const finishedIds = list.filter((f) => f.finished).map((f) => f.matchId);
  if (finishedIds.length > 0) {
    await db.update(activityFootballMatches).set({ status: "finished", updatedAt: now }).where(inArray(activityFootballMatches.matchId, finishedIds));
  }
  return n;
}

export async function libStatus() {
  const st = await readState().catch(() => null);
  const errorIsLatest = !!st?.lastErrorAt && (!st.lastSuccessAt || st.lastErrorAt >= st.lastSuccessAt);
  return { enabled: libEnabled(), lastSuccessAt: st?.lastSuccessAt ?? null, lastError: errorIsLatest ? st?.lastError ?? null : null };
}
