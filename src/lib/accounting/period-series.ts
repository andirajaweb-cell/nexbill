/**
 * Laba Rugi multi-periode (2026-11-21): membagi rentang tanggal menjadi kolom harian, mingguan,
 * bulanan, kuartalan, atau tahunan — kalender outlet (WIB), minggu Senin–Minggu. Kolom di ujung
 * rentang dipotong mengikuti rentang (mis. "1–15 Nov" bila rentangnya berakhir 15 Nov), jadi
 * jumlah semua kolom selalu sama dengan Laba Rugi satu periode untuk rentang yang sama.
 * Murni (tanpa DB), diuji di period-series.test.ts.
 */

export const PL_GRANULARITIES = ["day", "week", "month", "quarter", "year"] as const;
export type PlGranularity = (typeof PL_GRANULARITIES)[number];

/** Batas kolom per jenis — supaya tabel tetap terbaca dan server tidak menghitung ratusan periode. */
export const PL_MAX_COLUMNS: Record<PlGranularity, number> = { day: 31, week: 26, month: 24, quarter: 12, year: 10 };

export interface PeriodBucket {
  key: string;
  fromYmd: string;
  toYmd: string;
  /** Kolom terpotong oleh ujung rentang (tidak penuh satu minggu/bulan/...). */
  partial: boolean;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86400000);
}

/** Awal periode yang memuat tanggal `d`. */
function periodStart(g: PlGranularity, d: Date): Date {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (g) {
    case "day":
      return d;
    case "week":
      return addDays(d, -((d.getUTCDay() + 6) % 7)); // Senin
    case "month":
      return new Date(Date.UTC(y, m, 1));
    case "quarter":
      return new Date(Date.UTC(y, m - (m % 3), 1));
    case "year":
      return new Date(Date.UTC(y, 0, 1));
  }
}

/** Awal periode berikutnya. */
function nextStart(g: PlGranularity, start: Date): Date {
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  switch (g) {
    case "day":
      return addDays(start, 1);
    case "week":
      return addDays(start, 7);
    case "month":
      return new Date(Date.UTC(y, m + 1, 1));
    case "quarter":
      return new Date(Date.UTC(y, m + 3, 1));
    case "year":
      return new Date(Date.UTC(y + 1, 0, 1));
  }
}

function bucketKey(g: PlGranularity, start: Date): string {
  const ymd = fmt(start);
  if (g === "month") return ymd.slice(0, 7);
  if (g === "quarter") return `${start.getUTCFullYear()}-Q${Math.floor(start.getUTCMonth() / 3) + 1}`;
  if (g === "year") return String(start.getUTCFullYear());
  return ymd; // day & week: tanggal awal
}

/** Jumlah kolom yang akan terbentuk (untuk validasi sebelum menghitung). */
export function countPeriodBuckets(g: PlGranularity, fromYmd: string, toYmd: string): number {
  return buildPeriodBuckets(g, fromYmd, toYmd, Number.MAX_SAFE_INTEGER).length;
}

/**
 * Kolom-kolom periode dari `fromYmd` sampai `toYmd` (inklusif). Melempar pesan yang jelas bila
 * tanggal tidak valid, terbalik, atau kolomnya melebihi PL_MAX_COLUMNS.
 */
export function buildPeriodBuckets(g: PlGranularity, fromYmd: string, toYmd: string, maxColumns: number = PL_MAX_COLUMNS[g]): PeriodBucket[] {
  if (!PL_GRANULARITIES.includes(g)) throw new Error("Jenis periode tidak dikenal.");
  if (!YMD.test(fromYmd) || !YMD.test(toYmd)) throw new Error("Tanggal tidak valid.");
  const from = parseYmd(fromYmd);
  const to = parseYmd(toYmd);
  // Tanggal yang "meluber" (mis. 2026-13-01, 2026-02-30) ditolak — bukan digeser diam-diam.
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || fmt(from) !== fromYmd || fmt(to) !== toYmd) throw new Error("Tanggal tidak valid.");
  if (from > to) throw new Error("Tanggal awal harus sebelum tanggal akhir.");

  const out: PeriodBucket[] = [];
  let start = periodStart(g, from);
  while (start <= to) {
    const next = nextStart(g, start);
    const end = addDays(next, -1);
    const clipFrom = start < from ? from : start;
    const clipTo = end > to ? to : end;
    out.push({ key: bucketKey(g, start), fromYmd: fmt(clipFrom), toYmd: fmt(clipTo), partial: clipFrom > start || clipTo < end });
    if (out.length > maxColumns) {
      throw new Error(`Terlalu banyak kolom (${maxColumns} maksimal untuk jenis periode ini). Persempit rentang tanggal atau pilih periode yang lebih besar.`);
    }
    start = next;
  }
  return out;
}

/** Batas UTC (ISO) untuk satu hari kalender WIB — sama dengan cara laporan lain membaca tanggal outlet. */
export function ymdRangeToIso(fromYmd: string, toYmd: string): { from: string; to: string } {
  return {
    from: new Date(`${fromYmd}T00:00:00.000+07:00`).toISOString(),
    to: new Date(`${toYmd}T23:59:59.999+07:00`).toISOString(),
  };
}

/** Rentang bawaan saat jenis periode dipilih (relatif ke `todayYmd`). */
export function defaultSeriesRange(g: PlGranularity, todayYmd: string): { fromYmd: string; toYmd: string } {
  const t = parseYmd(todayYmd);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  switch (g) {
    case "day": // bulan berjalan sampai hari ini
      return { fromYmd: fmt(new Date(Date.UTC(y, m, 1))), toYmd: todayYmd };
    case "week": // 8 minggu terakhir, mulai Senin
      return { fromYmd: fmt(addDays(periodStart("week", t), -7 * 7)), toYmd: todayYmd };
    case "month": // Januari – bulan ini
      return { fromYmd: fmt(new Date(Date.UTC(y, 0, 1))), toYmd: todayYmd };
    case "quarter": // tahun ini
      return { fromYmd: fmt(new Date(Date.UTC(y, 0, 1))), toYmd: todayYmd };
    case "year": // 5 tahun terakhir
      return { fromYmd: fmt(new Date(Date.UTC(y - 4, 0, 1))), toYmd: todayYmd };
  }
}
