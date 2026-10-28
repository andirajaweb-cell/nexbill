/**
 * Service prakiraan cuaca BMKG (server). Satu cache per desa (activity_weather_cache), dipakai bersama
 * oleh semua outlet di desa yang sama; ringkasan harian diarsipkan ke activity_weather_daily untuk
 * analisis historis. Saat BMKG gagal/lambat, data terakhir yang berhasil tetap dipakai (ditandai lama).
 * Aturan murni (parse, normalisasi, kapan refresh) ada di bmkg-rules.ts.
 */
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { activityWeatherCache, activityWeatherDaily } from "@/db/schema";
import { BmkgFormatError, isValidAdm4, parseBmkgResponse, weatherNeedsRefresh, WEATHER_STALE_WARN_MS, type WeatherDay, type WeatherSnapshot } from "./bmkg-rules";
import { fetchJson, HttpJsonError } from "./http";

const BMKG_URL = (process.env.BMKG_API_URL || "https://api.bmkg.go.id/publik/prakiraan-cuaca").replace(/\/$/, "");

export interface WeatherResult {
  snapshot: WeatherSnapshot | null;
  fetchedAt: string | null;
  /** Data terakhir lebih tua dari 12 jam. */
  stale: boolean;
  /** Pesan aman untuk ditampilkan (tanpa detail internal). */
  error: string | null;
  errorAt: string | null;
}

/** Ambil langsung dari BMKG (tanpa cache). */
export async function fetchBmkg(adm4: string): Promise<WeatherSnapshot> {
  if (!isValidAdm4(adm4)) throw new BmkgFormatError("Kode wilayah tidak valid.");
  const { json } = await fetchJson(`${BMKG_URL}?adm4=${encodeURIComponent(adm4)}`, { label: "BMKG", timeoutMs: 8000, retries: 2, retry429: true });
  const snap = parseBmkgResponse(json, adm4);
  if (snap.slots.length === 0) throw new BmkgFormatError("BMKG belum menyediakan prakiraan untuk lokasi ini.");
  return snap;
}

function friendlyError(err: unknown): string {
  if (err instanceof BmkgFormatError) return err.message;
  if (err instanceof HttpJsonError) {
    if (err.status === 404) return "Lokasi tidak ditemukan di BMKG — periksa kode wilayah.";
    if (err.status === 429) return "BMKG membatasi permintaan sementara (batas 60/menit). Dicoba lagi otomatis.";
    if (err.status && err.status >= 500) return `Server BMKG sedang bermasalah (HTTP ${err.status}). Dicoba lagi otomatis.`;
    if (err.status == null) return "BMKG tidak dapat dihubungi (timeout/jaringan). Dicoba lagi otomatis.";
    return `BMKG menolak permintaan (HTTP ${err.status}).`;
  }
  return "Gagal memproses data BMKG.";
}

const inflight = new Map<string, Promise<void>>();

/** Ambil ulang dari BMKG dan simpan ke cache + arsip harian. Tidak pernah melempar. */
export async function refreshWeather(adm4: string): Promise<void> {
  if (!isValidAdm4(adm4)) return;
  const running = inflight.get(adm4);
  if (running) return running;
  const job = (async () => {
    const now = new Date().toISOString();
    try {
      const snap = await fetchBmkg(adm4);
      await db
        .insert(activityWeatherCache)
        .values({ adm4Code: adm4, payload: JSON.stringify(snap), analysisDate: snap.analysisDate, fetchedAt: now, lastAttemptAt: now, lastError: null, lastErrorAt: null })
        .onConflictDoUpdate({
          target: activityWeatherCache.adm4Code,
          set: { payload: JSON.stringify(snap), analysisDate: snap.analysisDate, fetchedAt: now, lastAttemptAt: now, lastError: null, lastErrorAt: null, updatedAt: now },
        });
      await archiveDays(adm4, snap.days, snap.analysisDate);
    } catch (err) {
      const msg = friendlyError(err);
      console.warn(`[activity-calendar] BMKG ${adm4}: ${err instanceof Error ? err.message : String(err)}`);
      await db
        .insert(activityWeatherCache)
        .values({ adm4Code: adm4, lastAttemptAt: now, lastError: msg, lastErrorAt: now })
        .onConflictDoUpdate({ target: activityWeatherCache.adm4Code, set: { lastAttemptAt: now, lastError: msg, lastErrorAt: now, updatedAt: now } })
        .catch(() => undefined);
    }
  })().finally(() => inflight.delete(adm4));
  inflight.set(adm4, job);
  return job;
}

/** Arsip: ringkasan per tanggal ditimpa prakiraan terbaru (prakiraan yang makin dekat makin akurat). */
async function archiveDays(adm4: string, days: WeatherDay[], analysisDate: string | null) {
  const now = new Date().toISOString();
  for (const d of days) {
    const row = {
      slots: d.slots,
      rainSlots: d.rainSlots,
      precipTotal: d.precipTotal,
      precipMax: d.precipMax,
      tempMin: d.tempMin,
      tempMax: d.tempMax,
      mainCode: d.mainCode,
      rainHours: d.rainHours.join(","),
      analysisDate,
      updatedAt: now,
    };
    await db
      .insert(activityWeatherDaily)
      .values({ adm4Code: adm4, localDate: d.date, ...row })
      .onConflictDoUpdate({ target: [activityWeatherDaily.adm4Code, activityWeatherDaily.localDate], set: row });
  }
}

/** Baca cache; `refreshIfDue` → bila perlu, ambil ulang dulu (dipakai sinkron terjadwal & refresh manual). */
export async function getWeather(adm4: string, opts: { refreshIfDue?: boolean } = {}): Promise<WeatherResult> {
  if (!isValidAdm4(adm4)) return { snapshot: null, fetchedAt: null, stale: false, error: null, errorAt: null };
  let [row] = await db.select().from(activityWeatherCache).where(eq(activityWeatherCache.adm4Code, adm4)).limit(1);
  if (opts.refreshIfDue && weatherNeedsRefresh(row?.fetchedAt ?? null, row?.lastAttemptAt ?? null, row?.lastErrorAt ?? null)) {
    await refreshWeather(adm4);
    [row] = await db.select().from(activityWeatherCache).where(eq(activityWeatherCache.adm4Code, adm4)).limit(1);
  }
  let snapshot: WeatherSnapshot | null = null;
  try {
    snapshot = row?.payload ? (JSON.parse(row.payload) as WeatherSnapshot) : null;
  } catch {
    snapshot = null;
  }
  const fetchedAt = row?.fetchedAt ?? null;
  const errorIsLatest = !!row?.lastErrorAt && (!fetchedAt || row.lastErrorAt >= fetchedAt);
  return {
    snapshot,
    fetchedAt,
    stale: !!fetchedAt && Date.now() - new Date(fetchedAt).getTime() > WEATHER_STALE_WARN_MS,
    error: errorIsLatest ? row?.lastError ?? null : null,
    errorAt: errorIsLatest ? row?.lastErrorAt ?? null : null,
  };
}

export function weatherDue(row: { fetchedAt: string | null; lastAttemptAt: string | null; lastErrorAt: string | null } | undefined): boolean {
  return weatherNeedsRefresh(row?.fetchedAt ?? null, row?.lastAttemptAt ?? null, row?.lastErrorAt ?? null);
}

export async function weatherCacheRow(adm4: string) {
  const [row] = await db.select().from(activityWeatherCache).where(eq(activityWeatherCache.adm4Code, adm4)).limit(1);
  return row;
}

/** Arsip ringkasan harian dalam rentang tanggal lokal. */
export async function archivedDays(adm4: string, fromDate: string, toDate: string) {
  return db
    .select()
    .from(activityWeatherDaily)
    .where(and(eq(activityWeatherDaily.adm4Code, adm4), gte(activityWeatherDaily.localDate, fromDate), lte(activityWeatherDaily.localDate, toDate)));
}

export async function weatherCacheRows(codes: string[]) {
  if (codes.length === 0) return [];
  return db.select().from(activityWeatherCache).where(inArray(activityWeatherCache.adm4Code, codes));
}
