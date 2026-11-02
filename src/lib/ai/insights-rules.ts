/**
 * Perhitungan murni AI Insights (tren, forecast, anomali) — diuji di insights-rules.test.ts.
 * Semua tanggal = "YYYY-MM-DD" kalender outlet.
 */

export type TrendDirection = "up" | "down" | "flat";

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

export function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Kemiringan kuadrat terkecil y terhadap indeks 0..n-1. */
export function linearSlope(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const mx = (n - 1) / 2;
  const my = mean(ys);
  let num = 0;
  let den = 0;
  ys.forEach((y, i) => {
    num += (i - mx) * (y - my);
    den += (i - mx) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

/**
 * Arah tren dengan ambang: perubahan sepanjang periode < 5% dari rata-rata dianggap "flat". Dulu
 * kemiringan sekecil apa pun (Rp1/hari) dilabeli "naik"/"turun" — menyesatkan pemilik.
 */
export function trendDirection(ys: number[], thresholdPct = 5): TrendDirection {
  const m = mean(ys);
  if (ys.length < 2 || m <= 0) return "flat";
  const { slope } = linearSlope(ys);
  const changePct = ((slope * (ys.length - 1)) / m) * 100;
  if (Math.abs(changePct) < thresholdPct) return "flat";
  return changePct > 0 ? "up" : "down";
}

export function addDaysYmd(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/** Deret `days` tanggal berurutan yang berakhir di `lastDate`, nilai kosong = 0. */
export function fillSeries(values: Map<string, number>, lastDate: string, days: number): { date: string; amount: number }[] {
  const out: { date: string; amount: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDaysYmd(lastDate, -i);
    out.push({ date, amount: Math.round(values.get(date) ?? 0) });
  }
  return out;
}

/**
 * Indeks hari dalam seminggu (rata-rata hari itu ÷ rata-rata semua hari). Rental PS sangat musiman
 * mingguan (Sabtu–Minggu ramai), jadi forecast garis lurus saja meleset. Butuh ≥ 2 sampel per hari
 * (≥ 14 hari); selain itu semua indeks 1.
 */
export function weekdayIndex(series: { date: string; amount: number }[]): number[] {
  const idx = new Array(7).fill(1);
  const overall = mean(series.map((s) => s.amount));
  if (series.length < 14 || overall <= 0) return idx;
  for (let w = 0; w < 7; w++) {
    const vals = series.filter((s) => weekdayOf(s.date) === w).map((s) => s.amount);
    if (vals.length >= 2) idx[w] = Math.round((mean(vals) / overall) * 1000) / 1000;
  }
  return idx;
}

/** Forecast `horizon` hari setelah `lastDate`: garis tren × indeks hari, dibatasi ≥ 0. */
export function forecastSeries(series: { date: string; amount: number }[], horizon: number): { date: string; amount: number }[] {
  const values = series.map((s) => s.amount);
  const { slope, intercept } = linearSlope(values);
  const idx = weekdayIndex(series);
  const last = series[series.length - 1]?.date;
  if (!last) return [];
  const out: { date: string; amount: number }[] = [];
  for (let i = 1; i <= horizon; i++) {
    const date = addDaysYmd(last, i);
    const base = Math.max(0, intercept + slope * (values.length - 1 + i));
    out.push({ date, amount: Math.max(0, Math.round(base * idx[weekdayOf(date)])) });
  }
  return out;
}

/**
 * Hari dengan omzet tidak wajar: dibandingkan dengan rata-rata HARI YANG SAMA dalam seminggu
 * (bukan rata-rata semua hari — kalau tidak, setiap Sabtu ramai terbaca "anomali"). |z| > 2.
 */
export function revenueAnomalies(series: { date: string; amount: number }[]) {
  const out: { date: string; amount: number; average: number; zScore: number }[] = [];
  for (let w = 0; w < 7; w++) {
    const group = series.filter((s) => weekdayOf(s.date) === w);
    if (group.length < 4) continue;
    const vals = group.map((g) => g.amount);
    const m = mean(vals);
    const sd = stddev(vals);
    if (sd === 0) continue;
    for (const g of group) {
      const z = (g.amount - m) / sd;
      if (Math.abs(z) > 2) out.push({ date: g.date, amount: g.amount, average: Math.round(m), zScore: Math.round(z * 10) / 10 });
    }
  }
  // Pola mingguan belum cukup → bandingkan dengan rata-rata keseluruhan.
  if (!out.length && series.length >= 7 && series.length < 28) {
    const vals = series.map((s) => s.amount);
    const m = mean(vals);
    const sd = stddev(vals);
    if (sd > 0) for (const s of series) {
      const z = (s.amount - m) / sd;
      if (Math.abs(z) > 2) out.push({ date: s.date, amount: s.amount, average: Math.round(m), zScore: Math.round(z * 10) / 10 });
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Persen perubahan; null bila pembanding 0. */
export function pctChange(now: number, before: number): number | null {
  return before > 0 ? Math.round(((now - before) / before) * 1000) / 10 : null;
}
