/**
 * Pemisahan laba di Neraca berdasarkan Tutup Periode (Task: "laporan yang sudah tertutup" harus
 * terbaca di Neraca).
 *
 * Tutup Periode di aplikasi ini mengunci posting per bulan ("YYYY-MM", bulan UTC — sama dengan
 * periodOf() di periods.ts) tanpa membuat jurnal penutup. Jadi di Neraca, laba sampai akhir
 * periode tertutup terakhir disajikan sebagai "Laba Ditahan (periode tertutup)", dan hanya laba
 * SETELAH itu yang disebut "Laba Periode Berjalan (belum ditutup)". Totalnya tetap sama —
 * murni penyajian, tidak mengubah saldo akun apa pun.
 *
 * Modul ini murni (tanpa DB) supaya mudah diuji.
 */

/** "2026-09" → "2026-09-01T00:00:00.000Z" */
export function monthStartIso(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toISOString();
}

/** "2026-09" → "2026-09-30T23:59:59.999Z" (akhir bulan UTC, cocok dengan periodOf = entryDate.slice(0,7)) */
export function monthEndIso(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m, 1) - 1).toISOString();
}

/** Bulan berikutnya: "2026-12" → "2027-01" */
export function nextPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export interface ClosedThrough {
  /** Periode tertutup terakhir yang ≤ periode tanggal laporan, atau null bila belum ada. */
  closedThrough: string | null;
  /** Batas akhir laba ditahan: akhir periode itu, dipotong ke tanggal laporan bila laporan jatuh di dalam periode tertutup. */
  closedEnd: string | null;
  /** Awal laba periode berjalan (instan setelah closedEnd), null bila belum ada periode tertutup. */
  currentFrom: string | null;
  /** Bulan tanggal laporan sendiri sudah ditutup → seluruh angka terkunci, laba berjalan = 0. */
  asOfPeriodClosed: boolean;
  /** Bulan yang MASIH TERBUKA di antara aktivitas pertama dan periode tertutup terakhir — sebaiknya ditutup juga. */
  openGaps: string[];
}

/**
 * @param closedPeriods daftar "YYYY-MM" yang berstatus closed
 * @param asOfIso tanggal laporan (ISO)
 * @param firstActivityPeriod bulan jurnal pertama outlet (untuk mendeteksi bulan terbuka yang terlewat), opsional
 */
export function resolveClosedThrough(closedPeriods: string[], asOfIso: string, firstActivityPeriod?: string | null): ClosedThrough {
  const asOfPeriod = asOfIso.slice(0, 7);
  const closedSet = new Set(closedPeriods);
  const eligible = closedPeriods.filter((p) => p <= asOfPeriod).sort();
  const latest = eligible.length ? eligible[eligible.length - 1] : null;
  if (!latest) return { closedThrough: null, closedEnd: null, currentFrom: null, asOfPeriodClosed: false, openGaps: [] };

  const end = monthEndIso(latest);
  const closedEnd = end < asOfIso ? end : asOfIso;
  const currentFrom = new Date(new Date(closedEnd).getTime() + 1).toISOString();

  const openGaps: string[] = [];
  let p = firstActivityPeriod && firstActivityPeriod < eligible[0] ? firstActivityPeriod : eligible[0];
  let guard = 0;
  while (p < latest && guard++ < 600) {
    if (!closedSet.has(p)) openGaps.push(p);
    p = nextPeriod(p);
  }

  return { closedThrough: latest, closedEnd, currentFrom, asOfPeriodClosed: latest === asOfPeriod, openGaps };
}

/** Pecah laba kumulatif menjadi bagian periode tertutup dan bagian berjalan. */
export function splitRetainedEarnings(cumulativeNetProfit: number, closedNetProfit: number | null) {
  const retainedEarningsClosed = closedNetProfit ?? 0;
  return { retainedEarningsClosed, currentPeriodNetProfit: cumulativeNetProfit - retainedEarningsClosed };
}

const LOCALE: Record<string, string> = { id: "id-ID", en: "en-US", ms: "ms-MY", th: "th-TH", fil: "fil-PH", vi: "vi-VN" };

/** "2026-09" → "September 2026" (sesuai bahasa). */
export function formatPeriodLabel(period: string, lang = "id"): string {
  return new Date(monthStartIso(period)).toLocaleDateString(LOCALE[lang] ?? "id-ID", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** "2026-09" → "1 September 2026" (sesuai bahasa). */
export function formatPeriodStart(period: string, lang = "id"): string {
  return new Date(monthStartIso(period)).toLocaleDateString(LOCALE[lang] ?? "id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Label baris ekuitas Neraca, dipakai bersama oleh UI, PDF, dan Excel supaya kata-katanya sama. */
export function balanceSheetProfitLabels(
  bs: { closedThroughPeriod: string | null; asOfPeriodClosed: boolean },
  lang: string,
  t: (key: string, fallback: string) => string
) {
  const retained = bs.closedThroughPeriod
    ? t("accounting.bs.retainedClosed", "Laba Ditahan (periode tertutup s/d {period})").replace("{period}", formatPeriodLabel(bs.closedThroughPeriod, lang))
    : null;
  const current =
    bs.closedThroughPeriod && !bs.asOfPeriodClosed
      ? t("accounting.bs.currentPeriodProfitSince", "Laba Periode Berjalan (belum ditutup, sejak {date})").replace("{date}", formatPeriodStart(nextPeriod(bs.closedThroughPeriod), lang))
      : t("accounting.bs.currentPeriodProfit", "Laba Periode Berjalan (belum ditutup)");
  return { retained, current };
}
