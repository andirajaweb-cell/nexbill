/**
 * Insight Kalender Bisnis (aturan murni — diuji di insights-rules.test.ts).
 *
 * Tiga jenis angka yang SELALU dibedakan di UI:
 *  - Aktual    : dari transaksi outlet (sesi rental selesai, omzet order terbayar).
 *  - Prakiraan : cuaca BMKG (bukan observasi), jadwal pertandingan Footballdata.io.
 *  - Prediksi  : baseline statistik sederhana = rata-rata hari yang sama dalam seminggu, 8 minggu terakhir.
 *                Tidak disesuaikan dengan cuaca/pertandingan — penyesuaian seperti itu butuh bukti yang
 *                belum ada.
 * Analisis hubungan cuaca/pertandingan dengan transaksi adalah KORELASI pada data outlet ini (dibandingkan
 * dengan hari yang sama dalam seminggu), bukan sebab-akibat, dan hanya ditampilkan bila sampel cukup.
 */

export interface DailyActual {
  date: string;
  sessions: number;
  revenue: number;
  /** Rata-rata durasi sesi (menit), null bila tidak ada sesi. */
  avgDurationMin: number | null;
}

export type Metric = "sessions" | "revenue" | "avgDurationMin";
export const METRICS: Metric[] = ["sessions", "revenue", "avgDurationMin"];

/** Minimal hari di tiap kelompok agar perbandingan ditampilkan. */
export const MIN_GROUP_DAYS = 5;
/** Baseline prediksi: minimal 3 hari pembanding pada hari yang sama dalam seminggu. */
export const MIN_BASELINE_DAYS = 3;
export const BASELINE_WEEKS = 8;

export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function metricOf(a: DailyActual, m: Metric): number | null {
  return m === "avgDurationMin" ? a.avgDurationMin : a[m];
}

/** Hari tanpa sesi & tanpa omzet dianggap tutup — tidak ikut rata-rata. */
export function isOpenDay(a: DailyActual): boolean {
  return a.sessions > 0 || a.revenue > 0;
}

export interface Baseline {
  sessions: number;
  revenue: number;
  avgDurationMin: number | null;
  /** Jumlah hari pembanding. */
  n: number;
}

/** Prediksi baseline untuk `date`: rata-rata hari yang sama dalam seminggu, `weeks` minggu sebelum `today`. */
export function baselineFor(date: string, today: string, actuals: DailyActual[], weeks = BASELINE_WEEKS): Baseline | null {
  const wd = weekdayOf(date);
  const from = addDays(today, -weeks * 7);
  const pool = actuals.filter((a) => a.date >= from && a.date < today && weekdayOf(a.date) === wd && isOpenDay(a));
  if (pool.length < MIN_BASELINE_DAYS) return null;
  const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const durs = pool.map((a) => a.avgDurationMin).filter((x): x is number => x != null);
  return {
    sessions: Math.round(avg(pool.map((a) => a.sessions)) * 10) / 10,
    revenue: Math.round(avg(pool.map((a) => a.revenue))),
    avgDurationMin: durs.length ? Math.round(avg(durs)) : null,
    n: pool.length,
  };
}

export interface GroupComparison {
  metric: Metric;
  /** Kelompok dengan kondisi (mis. hari hujan / hari ada pertandingan). */
  withN: number;
  withoutN: number;
  /** Rata-rata rasio terhadap rata-rata hari yang sama dalam seminggu (1 = normal). */
  withRatio: number | null;
  withoutRatio: number | null;
  /** Selisih relatif (%) kelompok "dengan" dibanding "tanpa"; null bila sampel kurang. */
  diffPct: number | null;
  enough: boolean;
}

/**
 * Bandingkan hari dengan kondisi vs tanpa kondisi, setelah dinormalkan per hari dalam seminggu (supaya
 * "hujan sering jatuh di akhir pekan" tidak terbaca sebagai efek hujan). `flags`: tanggal → true/false;
 * tanggal tanpa flag (mis. tidak ada arsip cuaca) tidak ikut dihitung.
 */
export function compareGroups(actuals: DailyActual[], flags: Map<string, boolean>, metric: Metric): GroupComparison {
  const open = actuals.filter(isOpenDay);
  const byWd = new Map<number, number[]>();
  for (const a of open) {
    const v = metricOf(a, metric);
    if (v == null) continue;
    const wd = weekdayOf(a.date);
    if (!byWd.has(wd)) byWd.set(wd, []);
    byWd.get(wd)!.push(v);
  }
  const wdMean = new Map([...byWd.entries()].map(([wd, xs]) => [wd, xs.reduce((s, x) => s + x, 0) / xs.length]));
  const withR: number[] = [];
  const withoutR: number[] = [];
  for (const a of open) {
    const flag = flags.get(a.date);
    if (flag === undefined) continue;
    const v = metricOf(a, metric);
    const mean = wdMean.get(weekdayOf(a.date));
    if (v == null || !mean) continue;
    (flag ? withR : withoutR).push(v / mean);
  }
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);
  const wr = avg(withR);
  const wor = avg(withoutR);
  const enough = withR.length >= MIN_GROUP_DAYS && withoutR.length >= MIN_GROUP_DAYS;
  return {
    metric,
    withN: withR.length,
    withoutN: withoutR.length,
    withRatio: wr == null ? null : Math.round(wr * 1000) / 1000,
    withoutRatio: wor == null ? null : Math.round(wor * 1000) / 1000,
    diffPct: enough && wr != null && wor ? Math.round((wr / wor - 1) * 1000) / 10 : null,
    enough,
  };
}

/** Perbedaan di bawah ini dianggap "tidak terlihat perbedaan berarti". */
export const NEGLIGIBLE_DIFF_PCT = 5;

export type Direction = "higher" | "lower" | "similar" | "insufficient";

export function directionOf(c: GroupComparison): Direction {
  if (!c.enough || c.diffPct == null) return "insufficient";
  if (Math.abs(c.diffPct) < NEGLIGIBLE_DIFF_PCT) return "similar";
  return c.diffPct > 0 ? "higher" : "lower";
}
