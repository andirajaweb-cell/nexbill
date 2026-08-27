import { db } from "@/db/client";
import { orders, expenses } from "@/db/schema";
import { sql } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Pure-computation trend/forecast/anomaly detection — no AI call, so this is
 * cheap to run on every dashboard load. Only generateRecommendations() below
 * makes a Claude call, and only when the user explicitly asks for a narrative
 * (keeps token spend opt-in, not automatic on every page view).
 */

function mean(xs: number[]) {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}
function stddev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}
/** Least-squares slope of y over index 0..n-1 — used as a simple trend direction/rate, and to extrapolate a linear forecast. */
function linearSlope(ys: number[]): { slope: number; intercept: number } {
  const n = ys.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0 };
  const xs = ys.map((_, i) => i);
  const mx = mean(xs);
  const my = mean(ys);
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: my - slope * mx };
}

async function dailyRevenue(outletId: string, days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await db
    .select({ day: sql<string>`substr(${orders.createdAt}, 1, 10)`, total: sql<number>`sum(${orders.total})` })
    .from(orders)
    .where(sql`${orders.outletId} = ${outletId} AND ${orders.status} = 'paid' AND ${orders.createdAt} >= ${since}`)
    .groupBy(sql`substr(${orders.createdAt}, 1, 10)`)
    .orderBy(sql`substr(${orders.createdAt}, 1, 10)`);
  return rows.map((r) => ({ date: r.day, amount: r.total ?? 0 }));
}

async function dailyExpense(outletId: string, days: number) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const rows = await db
    .select()
    .from(expenses)
    .where(sql`${expenses.outletId} = ${outletId} AND ${expenses.status} IN ('approved','paid') AND ${expenses.expenseDate} >= ${since}`);
  const map = new Map<string, number>();
  for (const e of rows) {
    const day = e.expenseDate.slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + e.amount + (e.taxAmount ?? 0));
  }
  return Array.from(map.entries()).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date));
}

/** Fills in zero-amount days so the series is evenly spaced (missing days otherwise skew mean/stddev and the trend slope). */
function fillDailySeries(rows: { date: string; amount: number }[], days: number) {
  const map = new Map(rows.map((r) => [r.date, r.amount]));
  const out: { date: string; amount: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ date: d, amount: map.get(d) ?? 0 });
  }
  return out;
}

export async function computeTrends(outletId: string, days = 30) {
  const revenue = fillDailySeries(await dailyRevenue(outletId, days), days);
  const expense = fillDailySeries(await dailyExpense(outletId, days), days);

  const revValues = revenue.map((r) => r.amount);
  const expValues = expense.map((e) => e.amount);
  const revTrend = linearSlope(revValues);
  const expTrend = linearSlope(expValues);

  // Week-over-week comparison: last 7 days vs the 7 days before that.
  const last7 = revValues.slice(-7).reduce((s, x) => s + x, 0);
  const prev7 = revValues.slice(-14, -7).reduce((s, x) => s + x, 0);
  const wowChangePercent = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 1000) / 10 : null;

  return {
    days,
    revenue,
    expense,
    revenueTrendDirection: revTrend.slope > 0 ? "naik" : revTrend.slope < 0 ? "turun" : "stabil",
    revenueTrendPerDay: Math.round(revTrend.slope),
    expenseTrendDirection: expTrend.slope > 0 ? "naik" : expTrend.slope < 0 ? "turun" : "stabil",
    expenseTrendPerDay: Math.round(expTrend.slope),
    last7DaysRevenue: last7,
    prev7DaysRevenue: prev7,
    wowChangePercent,
  };
}

/** Naive linear-trend forecast for the next `horizonDays` — extrapolates the least-squares line fit to the last `days` of history. Clamped at 0 (revenue can't go negative). Simple by design: no seasonality/holiday modeling — good enough for a directional heads-up, not a financial commitment. */
export async function computeForecast(outletId: string, days = 30, horizonDays = 7) {
  const revenue = fillDailySeries(await dailyRevenue(outletId, days), days);
  const values = revenue.map((r) => r.amount);
  const { slope, intercept } = linearSlope(values);

  const forecast: { date: string; amount: number }[] = [];
  for (let i = 0; i < horizonDays; i++) {
    const x = values.length + i;
    const amount = Math.max(0, Math.round(intercept + slope * x));
    const date = new Date(Date.now() + (i + 1) * 86400000).toISOString().slice(0, 10);
    forecast.push({ date, amount });
  }

  return {
    basedOnDays: days,
    horizonDays,
    forecast,
    forecastTotal: forecast.reduce((s, f) => s + f.amount, 0),
    historicalDailyAverage: Math.round(mean(values)),
  };
}

/** Flags expense categories and individual days with unusually high spend — z-score > 2 (>2 standard deviations above the category/day mean) is the anomaly threshold, a standard simple-and-explainable choice for small samples. */
export async function detectAnomalies(outletId: string, days = 60) {
  const rows = await db
    .select()
    .from(expenses)
    .where(sql`${expenses.outletId} = ${outletId} AND ${expenses.status} IN ('approved','paid') AND ${expenses.expenseDate} >= ${new Date(Date.now() - days * 86400000).toISOString()}`);

  // Per-category anomaly: individual expense far above that category's own historical average.
  const byCategory = new Map<string, number[]>();
  for (const e of rows) {
    const amt = e.amount + (e.taxAmount ?? 0);
    byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), amt]);
  }
  const categoryAnomalies: { category: string; expenseId: string; description: string | null; amount: number; categoryAverage: number; zScore: number }[] = [];
  for (const e of rows) {
    const amt = e.amount + (e.taxAmount ?? 0);
    const series = byCategory.get(e.category) ?? [];
    if (series.length < 3) continue; // not enough history to judge "unusual"
    const m = mean(series);
    const sd = stddev(series);
    if (sd === 0) continue;
    const z = (amt - m) / sd;
    if (z > 2) categoryAnomalies.push({ category: e.category, expenseId: e.id, description: e.description, amount: amt, categoryAverage: Math.round(m), zScore: Math.round(z * 10) / 10 });
  }
  categoryAnomalies.sort((a, b) => b.zScore - a.zScore);

  // Day-level anomaly: total daily revenue far below/above the period's own average.
  const revenue = fillDailySeries(await dailyRevenue(outletId, days), days);
  const values = revenue.map((r) => r.amount);
  const m = mean(values);
  const sd = stddev(values);
  const revenueAnomalies = sd > 0
    ? revenue.filter((r) => Math.abs((r.amount - m) / sd) > 2).map((r) => ({ date: r.date, amount: r.amount, average: Math.round(m), zScore: Math.round(((r.amount - m) / sd) * 10) / 10 }))
    : [];

  return { categoryAnomalies: categoryAnomalies.slice(0, 15), revenueAnomalies };
}

/**
 * One Claude call that turns the structured trend/forecast/anomaly numbers
 * (already computed above, no extra DB round-trips) into a short narrative
 * with prioritized, concrete recommendations — the "so what do I actually
 * do about this" layer on top of the raw stats.
 */
export async function generateRecommendations(outletId: string, outletName: string) {
  const [trends, forecast, anomalies] = await Promise.all([
    computeTrends(outletId, 30),
    computeForecast(outletId, 30, 7),
    detectAnomalies(outletId, 60),
  ]);

  const prompt = `Data bisnis "${outletName}" (30 hari terakhir):
- Tren revenue: ${trends.revenueTrendDirection}, ~Rp${trends.revenueTrendPerDay.toLocaleString("id-ID")}/hari
- Tren expense: ${trends.expenseTrendDirection}, ~Rp${trends.expenseTrendPerDay.toLocaleString("id-ID")}/hari
- Revenue 7 hari terakhir: Rp${trends.last7DaysRevenue.toLocaleString("id-ID")} vs 7 hari sebelumnya: Rp${trends.prev7DaysRevenue.toLocaleString("id-ID")} (${trends.wowChangePercent ?? "-"}%)
- Forecast revenue 7 hari ke depan: total ~Rp${forecast.forecastTotal.toLocaleString("id-ID")} (rata-rata harian historis Rp${forecast.historicalDailyAverage.toLocaleString("id-ID")})
- Anomali biaya (z-score>2): ${JSON.stringify(anomalies.categoryAnomalies.slice(0, 5))}
- Anomali revenue harian: ${JSON.stringify(anomalies.revenueAnomalies.slice(0, 5))}

Sebagai analis bisnis, tulis ringkasan singkat (maks 4 kalimat) kondisi bisnis saat ini, lalu 3-5 rekomendasi aksi konkret berpoin, dalam Bahasa Indonesia. Fokus ke hal yang actionable, bukan generik. Format: paragraf ringkasan dulu, lalu list rekomendasi pakai "- ".`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-5",
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });
  const text = response.content.filter((c): c is Anthropic.TextBlock => c.type === "text").map((t) => t.text).join("\n");

  return { narrative: text, trends, forecast, anomalies };
}
