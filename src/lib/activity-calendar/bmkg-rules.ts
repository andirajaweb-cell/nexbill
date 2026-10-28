/**
 * Normalisasi prakiraan cuaca BMKG (aturan murni — tanpa jaringan/DB; diuji di bmkg-rules.test.ts).
 *
 * Sumber: https://data.bmkg.go.id/prakiraan-cuaca/ — endpoint publik
 *   GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode wilayah tingkat IV}
 * Prakiraan 3 hari, per 3 jam (8 data/hari), diperbarui 2× sehari, batas 60 permintaan/menit/IP.
 * Wajib menampilkan BMKG sebagai sumber data.
 *
 * Bentuk respons (diverifikasi 2026-10-28):
 *   { lokasi: { adm4, desa, kecamatan, kotkab, provinsi, lat, lon, timezone: "Asia/Jakarta" },
 *     data: [ { lokasi: { ..., timezone: "+0700" }, cuaca: [ [slot, …], [slot, …], … ] } ] }
 *   slot: { datetime (UTC ISO), local_datetime "YYYY-MM-DD HH:mm:ss", t (°C), hu (%), tp (mm, curah hujan),
 *           tcc (% awan), weather (kode), weather_desc, weather_desc_en, ws (km/jam), wd, analysis_date }
 * `tp` tidak tercantum di halaman dokumentasi tetapi ada di JSON — diperlakukan opsional.
 */

export const ADM4_RE = /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/;

export function isValidAdm4(code: string | null | undefined): code is string {
  return !!code && ADM4_RE.test(code.trim());
}

export type RainLevel = "none" | "light" | "moderate" | "heavy" | "thunder";
export type SkyKind = "clear" | "partly" | "cloudy" | "fog" | "haze" | "rain" | "thunder";

export interface WeatherSlot {
  /** Waktu UTC ISO. */
  utc: string;
  /** Tanggal & jam lokal lokasi (dari BMKG, sudah dalam zona waktu lokasi). */
  date: string;
  hour: number;
  tempC: number | null;
  humidity: number | null;
  /** Curah hujan (mm) per 3 jam bila tersedia. */
  precipMm: number | null;
  cloud: number | null;
  windKmh: number | null;
  windDir: string | null;
  code: number | null;
  descId: string;
  descEn: string;
  rain: RainLevel;
  sky: SkyKind;
}

export interface WeatherDay {
  date: string;
  slots: number;
  rainSlots: number;
  precipTotal: number | null;
  precipMax: number | null;
  tempMin: number | null;
  tempMax: number | null;
  /** Kondisi terburuk hari itu (petir > lebat > sedang > ringan > tidak hujan). */
  worstRain: RainLevel;
  /** Kondisi langit yang paling sering. */
  sky: SkyKind;
  /** Jam lokal (awal slot 3 jam) yang diprakirakan hujan. */
  rainHours: number[];
  /** Kode BMKG dari slot terburuk/terbanyak — untuk arsip. */
  mainCode: number | null;
}

export interface WeatherLocation {
  adm4: string;
  desa: string | null;
  kecamatan: string | null;
  kotkab: string | null;
  provinsi: string | null;
  lat: number | null;
  lon: number | null;
}

export interface WeatherSnapshot {
  location: WeatherLocation;
  timezone: string;
  /** Waktu produksi prakiraan (UTC ISO) — "diperbarui BMKG". */
  analysisDate: string | null;
  slots: WeatherSlot[];
  days: WeatherDay[];
}

const OFFSET_TO_TZ: Record<string, string> = { "+0700": "Asia/Jakarta", "+0800": "Asia/Makassar", "+0900": "Asia/Jayapura" };
const KNOWN_TZ = new Set(Object.values(OFFSET_TO_TZ));

/** Zona waktu IANA dari BMKG ("Asia/Jakarta" di lokasi utama, "+0700" di data). Bawaan WIB. */
export function timezoneFromBmkg(top: unknown, inner: unknown): string {
  if (typeof top === "string" && KNOWN_TZ.has(top)) return top;
  if (typeof inner === "string" && OFFSET_TO_TZ[inner]) return OFFSET_TO_TZ[inner];
  return "Asia/Jakarta";
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Tingkat hujan dari kode, deskripsi, dan curah hujan. Petir selalu dianggap paling berat. */
export function rainLevelOf(code: number | null, descId: string, descEn: string, precipMm: number | null): RainLevel {
  const d = `${descId} ${descEn}`.toLowerCase();
  if (code === 95 || code === 97 || /petir|thunder/.test(d)) return "thunder";
  const rainy = (code != null && code >= 60 && code < 100) || /hujan|rain|shower|drizzle|gerimis/.test(d);
  if (!rainy) return "none";
  if (/lebat|heavy/.test(d) || (precipMm != null && precipMm >= 10)) return "heavy";
  if (/sedang|moderate/.test(d) || (precipMm != null && precipMm >= 2.5)) return "moderate";
  return "light";
}

export function skyOf(code: number | null, descId: string, descEn: string, rain: RainLevel): SkyKind {
  if (rain === "thunder") return "thunder";
  if (rain !== "none") return "rain";
  const d = `${descId} ${descEn}`.toLowerCase();
  if (/kabut|fog|mist/.test(d) || code === 45) return "fog";
  if (/asap|smoke|kabur|haze/.test(d) || code === 5 || code === 10) return "haze";
  if (/cerah berawan|partly/.test(d) || code === 1 || code === 2) return "partly";
  if (/berawan|cloud|overcast/.test(d) || code === 3 || code === 4) return "cloudy";
  return "clear";
}

const RAIN_RANK: Record<RainLevel, number> = { none: 0, light: 1, moderate: 2, heavy: 3, thunder: 4 };

export function worseRain(a: RainLevel, b: RainLevel): RainLevel {
  return RAIN_RANK[a] >= RAIN_RANK[b] ? a : b;
}

/** Satu slot BMKG → WeatherSlot. Slot tanpa waktu lokal yang valid dibuang (null). */
export function normalizeSlot(raw: Record<string, unknown>): WeatherSlot | null {
  const local = str(raw.local_datetime);
  const m = local ? /^(\d{4}-\d{2}-\d{2})[ T](\d{2}):/.exec(local) : null;
  if (!m) return null;
  const utcRaw = str(raw.datetime) ?? (str(raw.utc_datetime) ? `${str(raw.utc_datetime)!.replace(" ", "T")}Z` : null);
  const utcDate = utcRaw ? new Date(utcRaw) : null;
  if (!utcDate || Number.isNaN(utcDate.getTime())) return null;
  const code = num(raw.weather);
  const descId = str(raw.weather_desc) ?? "";
  const descEn = str(raw.weather_desc_en) ?? "";
  const precipMm = num(raw.tp);
  const rain = rainLevelOf(code, descId, descEn, precipMm);
  return {
    utc: utcDate.toISOString(),
    date: m[1],
    hour: Number(m[2]),
    tempC: num(raw.t),
    humidity: num(raw.hu),
    precipMm,
    cloud: num(raw.tcc),
    windKmh: num(raw.ws),
    windDir: str(raw.wd),
    code,
    descId,
    descEn,
    rain,
    sky: skyOf(code, descId, descEn, rain),
  };
}

/** Ringkasan per tanggal lokal. */
export function summarizeDays(slots: WeatherSlot[]): WeatherDay[] {
  const byDate = new Map<string, WeatherSlot[]>();
  for (const s of slots) {
    if (!byDate.has(s.date)) byDate.set(s.date, []);
    byDate.get(s.date)!.push(s);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const temps = list.map((s) => s.tempC).filter((x): x is number => x != null);
      const precs = list.map((s) => s.precipMm).filter((x): x is number => x != null);
      const rainy = list.filter((s) => s.rain !== "none");
      const worstRain = list.reduce<RainLevel>((w, s) => worseRain(w, s.rain), "none");
      const skyCount = new Map<SkyKind, number>();
      for (const s of list) skyCount.set(s.sky, (skyCount.get(s.sky) ?? 0) + 1);
      const sky = rainy.length > 0 ? (worstRain === "thunder" ? "thunder" : "rain") : [...skyCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
      const worstSlot = rainy.length ? rainy.reduce((a, b) => (RAIN_RANK[b.rain] > RAIN_RANK[a.rain] ? b : a)) : list[0];
      return {
        date,
        slots: list.length,
        rainSlots: rainy.length,
        precipTotal: precs.length ? Math.round(precs.reduce((a, b) => a + b, 0) * 10) / 10 : null,
        precipMax: precs.length ? Math.max(...precs) : null,
        tempMin: temps.length ? Math.min(...temps) : null,
        tempMax: temps.length ? Math.max(...temps) : null,
        worstRain,
        sky,
        rainHours: rainy.map((s) => s.hour).sort((a, b) => a - b),
        mainCode: worstSlot?.code ?? null,
      };
    });
}

export class BmkgFormatError extends Error {}

/** Respons JSON BMKG → WeatherSnapshot. Melempar BmkgFormatError bila bentuknya tidak dikenali. */
export function parseBmkgResponse(json: unknown, adm4: string): WeatherSnapshot {
  if (!json || typeof json !== "object") throw new BmkgFormatError("Respons BMKG kosong.");
  const root = json as { lokasi?: Record<string, unknown>; data?: unknown };
  const first = Array.isArray(root.data) ? (root.data[0] as { lokasi?: Record<string, unknown>; cuaca?: unknown } | undefined) : undefined;
  if (!first || !Array.isArray(first.cuaca)) throw new BmkgFormatError("Format respons BMKG tidak dikenali (data.cuaca tidak ada).");
  const lok = { ...(first.lokasi ?? {}), ...(root.lokasi ?? {}) };
  const rawSlots = (first.cuaca as unknown[]).flat().filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  const seen = new Set<string>();
  const slots: WeatherSlot[] = [];
  for (const r of rawSlots) {
    const s = normalizeSlot(r);
    if (!s || seen.has(s.utc)) continue;
    seen.add(s.utc);
    slots.push(s);
  }
  slots.sort((a, b) => a.utc.localeCompare(b.utc));
  const analysis = rawSlots.map((r) => str(r.analysis_date)).find(Boolean) ?? null;
  const analysisDate = analysis ? new Date(analysis.endsWith("Z") ? analysis : `${analysis}Z`) : null;
  return {
    location: {
      adm4: str(lok.adm4) ?? adm4,
      desa: str(lok.desa),
      kecamatan: str(lok.kecamatan),
      kotkab: str(lok.kotkab),
      provinsi: str(lok.provinsi),
      lat: num(lok.lat),
      lon: num(lok.lon),
    },
    timezone: timezoneFromBmkg(root.lokasi?.timezone, first.lokasi?.timezone),
    analysisDate: analysisDate && !Number.isNaN(analysisDate.getTime()) ? analysisDate.toISOString() : null,
    slots,
    days: summarizeDays(slots),
  };
}

export function locationLabel(l: WeatherLocation): string {
  return [l.desa, l.kecamatan, l.kotkab, l.provinsi].filter(Boolean).join(", ");
}

/** Cache dianggap segar 3 jam (BMKG memperbarui 2× sehari); setelah 12 jam ditandai "data lama". */
export const WEATHER_FRESH_MS = 3 * 3600_000;
export const WEATHER_STALE_WARN_MS = 12 * 3600_000;
/** Jeda minimal antar-percobaan setelah gagal (supaya halaman yang sering dibuka tidak membanjiri BMKG). */
export const WEATHER_RETRY_AFTER_FAIL_MS = 10 * 60_000;

export function weatherNeedsRefresh(fetchedAt: string | null, lastAttemptAt: string | null, lastErrorAt: string | null, now = Date.now()): boolean {
  if (lastErrorAt && lastAttemptAt && lastErrorAt >= lastAttemptAt && now - new Date(lastAttemptAt).getTime() < WEATHER_RETRY_AFTER_FAIL_MS) return false;
  if (!fetchedAt) return true;
  return now - new Date(fetchedAt).getTime() > WEATHER_FRESH_MS;
}

/** Hari dianggap "hujan di jam buka" bila ada slot hujan antara 09.00 dan 23.59 waktu lokal. */
export function rainyDuringOpenHours(rainHours: number[]): boolean {
  return rainHours.some((h) => h >= 9 && h <= 21);
}
