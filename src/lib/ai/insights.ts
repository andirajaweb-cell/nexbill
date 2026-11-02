import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { activitySyncState, expenses } from "@/db/schema";
import { outletDateYmd } from "@/lib/time/outlet-time";
import { normalizeReportRange } from "@/lib/reports/range";
import { computeInventoryReport, computeRentalReport, dailyRecognizedRevenue } from "@/lib/reports/operational";
import { isMissingRelation } from "@/lib/activity-calendar/http";
import { LANG_OPTIONS, type LangCode } from "@/lib/i18n/registry";
import type { PlanFeature } from "@/lib/subscription/pricing";
import { addDaysYmd, fillSeries, forecastSeries, mean, pctChange, revenueAnomalies, stddev, trendDirection, weekdayIndex } from "./insights-rules";
import { businessCalendarSummary, compactForAi, executeBusinessTool, resolveToolFeatures, todaySnapshot } from "./business-tools";
import { AI_INSIGHTS_MODEL, createMessage, textOf, usageOf } from "./models";
import { recordAiTokens } from "./quota";
import { clip } from "./quota-rules";

/**
 * AI Insights: tren, forecast, anomali = perhitungan murni (tanpa panggilan AI, murah dimuat tiap
 * buka halaman). Hanya generateRecommendations() yang memanggil Claude — atas permintaan pengguna,
 * dibatasi kuota, dan hasilnya di-cache 6 jam per outlet.
 *
 * Perbaikan 2026-11-02:
 *  - Tanggal memakai kalender outlet (WIB). Dulu pendapatan dikelompokkan per tanggal UTC sedangkan
 *    biaya per tanggal WIB → biaya dini hari "hilang" dari deret, dan tanggal deret ≠ tanggal Laporan.
 *  - Pendapatan memakai aturan Laporan Penjualan (Business Date, order paid + partial).
 *  - Hari ini (belum selesai) tidak ikut tren/anomali — dulu selalu terbaca "turun"/anomali.
 *  - Arah tren memakai ambang 5% (dulu Rp1/hari pun "naik"); kode up/down/flat diterjemahkan UI.
 *  - Forecast memakai pola hari dalam seminggu; anomali dibanding hari yang sama dalam seminggu.
 */

function lastCompleteDay(): string {
  return addDaysYmd(outletDateYmd(new Date()), -1);
}

async function revenueSeries(outletId: string, days: number) {
  const last = lastCompleteDay();
  const first = addDaysYmd(last, -(days - 1));
  const r = normalizeReportRange(first, last);
  return fillSeries(await dailyRecognizedRevenue(outletId, r.from, r.to), last, days);
}

async function expenseRows(outletId: string, days: number) {
  const last = lastCompleteDay();
  const r = normalizeReportRange(addDaysYmd(last, -(days - 1)), last);
  return db
    .select()
    .from(expenses)
    .where(sql`${expenses.outletId} = ${outletId} AND ${expenses.status} IN ('approved','paid') AND ${expenses.expenseDate} >= ${r.from} AND ${expenses.expenseDate} <= ${r.to}`);
}

async function expenseSeries(outletId: string, days: number) {
  const map = new Map<string, number>();
  for (const e of await expenseRows(outletId, days)) {
    const day = outletDateYmd(new Date(e.expenseDate));
    map.set(day, (map.get(day) ?? 0) + e.amount + (e.taxAmount ?? 0));
  }
  return fillSeries(map, lastCompleteDay(), days);
}

export async function computeTrends(outletId: string, days = 30) {
  const [revenue, expense] = await Promise.all([revenueSeries(outletId, days), expenseSeries(outletId, days)]);
  const revValues = revenue.map((r) => r.amount);
  const expValues = expense.map((e) => e.amount);
  const last7 = revValues.slice(-7).reduce((s, x) => s + x, 0);
  const prev7 = revValues.slice(-14, -7).reduce((s, x) => s + x, 0);
  return {
    days,
    until: revenue[revenue.length - 1]?.date ?? null,
    revenue,
    expense,
    revenueTrend: trendDirection(revValues),
    revenueDailyAverage: Math.round(mean(revValues)),
    expenseTrend: trendDirection(expValues),
    expenseDailyAverage: Math.round(mean(expValues)),
    last7DaysRevenue: last7,
    prev7DaysRevenue: prev7,
    wowChangePercent: pctChange(last7, prev7),
  };
}

/** Forecast 7 hari mulai hari ini: tren linear × pola hari dalam seminggu (8 minggu riwayat). */
export async function computeForecast(outletId: string, days = 56, horizonDays = 7) {
  const revenue = await revenueSeries(outletId, days);
  const forecast = forecastSeries(revenue, horizonDays);
  const idx = weekdayIndex(revenue);
  return {
    basedOnDays: days,
    horizonDays,
    forecast,
    forecastTotal: forecast.reduce((s, f) => s + f.amount, 0),
    historicalDailyAverage: Math.round(mean(revenue.map((r) => r.amount))),
    weekdayPattern: idx.some((v) => v !== 1),
  };
}

/** Biaya per kategori dengan z-score > 2 terhadap rata-rata kategorinya, dan omzet harian tidak wajar. */
export async function detectAnomalies(outletId: string, days = 60) {
  const rows = await expenseRows(outletId, days);
  const byCategory = new Map<string, number[]>();
  for (const e of rows) {
    const amt = e.amount + (e.taxAmount ?? 0);
    byCategory.set(e.category, [...(byCategory.get(e.category) ?? []), amt]);
  }
  const categoryAnomalies: { category: string; expenseId: string; description: string | null; amount: number; categoryAverage: number; zScore: number }[] = [];
  for (const e of rows) {
    const amt = e.amount + (e.taxAmount ?? 0);
    const series = byCategory.get(e.category) ?? [];
    if (series.length < 3) continue;
    const m = mean(series);
    const sd = stddev(series);
    if (sd === 0) continue;
    const z = (amt - m) / sd;
    if (z > 2) categoryAnomalies.push({ category: e.category, expenseId: e.id, description: e.description, amount: amt, categoryAverage: Math.round(m), zScore: Math.round(z * 10) / 10 });
  }
  categoryAnomalies.sort((a, b) => b.zScore - a.zScore);
  const revenue = await revenueSeries(outletId, days);
  return { categoryAnomalies: categoryAnomalies.slice(0, 15), revenueAnomalies: revenueAnomalies(revenue).slice(-15) };
}

/* ------------------------------------------------------------------ rekomendasi (Claude) */

export const RECOMMENDATION_CACHE_MS = 6 * 60 * 60 * 1000;
const cacheKey = (outletId: string) => `ai-reco:${outletId}`;

interface CachedRecommendation {
  narrative: string;
  lang: LangCode;
  generatedAt: string;
}

export async function cachedRecommendation(outletId: string, lang: LangCode): Promise<CachedRecommendation | null> {
  try {
    const [row] = await db.select({ payload: activitySyncState.payload }).from(activitySyncState).where(eq(activitySyncState.key, cacheKey(outletId))).limit(1);
    if (!row?.payload) return null;
    const c = JSON.parse(row.payload) as CachedRecommendation;
    if (!c?.narrative || c.lang !== lang) return null;
    if (Date.now() - new Date(c.generatedAt).getTime() > RECOMMENDATION_CACHE_MS) return null;
    return c;
  } catch (err) {
    if (!isMissingRelation(err) && !(err instanceof SyntaxError)) throw err;
    return null;
  }
}

async function saveRecommendation(outletId: string, c: CachedRecommendation) {
  const payload = JSON.stringify(c);
  const now = new Date().toISOString();
  try {
    await db
      .insert(activitySyncState)
      .values({ key: cacheKey(outletId), payload, lastSuccessAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: activitySyncState.key, set: { payload, lastSuccessAt: now, updatedAt: now } });
  } catch (err) {
    if (!isMissingRelation(err)) throw err;
  }
}

/** Paket konteks lintas fitur untuk rekomendasi (dibaca langsung dari DB, tanpa loop tool AI). */
async function integratedContext(outletId: string, features: PlanFeature[] | null) {
  const has = (f: PlanFeature) => !features || features.includes(f);
  const last = lastCompleteDay();
  const r30 = normalizeReportRange(addDaysYmd(last, -29), last);
  const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      console.warn("[ai-insights] konteks gagal:", err instanceof Error ? err.message : err);
      return null;
    }
  };
  const [now, rental, inventory, calendar, bookingsNext7, shiftReview] = await Promise.all([
    safe(() => todaySnapshot(outletId)),
    safe(() => computeRentalReport(outletId, r30.from, r30.to)),
    safe(() => computeInventoryReport(outletId, r30.from, r30.to)),
    has("activity_calendar") ? safe(() => businessCalendarSummary(outletId, 7)) : Promise.resolve(null),
    safe(async () => JSON.parse(await executeBusinessTool("get_bookings", {}, { outletId, features })) as unknown),
    safe(async () => JSON.parse(await executeBusinessTool("get_shift_review", { from: addDaysYmd(last, -29), to: last }, { outletId, features })) as unknown),
  ]);
  return compactForAi({
    now: now && { units: now.units, runningSessions: now.runningSessions.length, openShifts: now.openShifts.length, nexbillTv: now.nexbillTv, lowStock: now.lowStockItems },
    rental30d: rental && {
      totalSessions: rental.totalSessions,
      totalRevenue: rental.totalRevenue,
      avgDurationMinutes: rental.avgDurationMinutes,
      topUnits: rental.perUnit.slice(0, 3).map((u) => ({ unit: u.unitName, sessions: u.sessionsCount, revenue: u.revenue })),
      weakestUnits: rental.perUnit.slice(-3).map((u) => ({ unit: u.unitName, sessions: u.sessionsCount, revenue: u.revenue })),
    },
    fnb30d: inventory && {
      revenue: inventory.totalRevenue,
      margin: inventory.totalMargin,
      topProducts: [...inventory.perProduct].sort((a, b) => (b.revenue ?? 0) - (a.revenue ?? 0)).slice(0, 5).map((p) => ({ name: p.name, qty: p.qty, revenue: p.revenue, margin: p.margin })),
      waste: inventory.waste.slice(0, 5),
    },
    businessCalendarNext7: calendar,
    bookingsNext7,
    shifts30d: shiftReview && typeof shiftReview === "object" ? { ...(shiftReview as Record<string, unknown>), list: undefined } : null,
  });
}

/**
 * Satu panggilan Claude yang mengubah angka tren/forecast/anomali + konteks lintas fitur (Kalender
 * Bisnis, booking, unit, F&B, shift, NEXBILL TV) menjadi ringkasan dan rekomendasi aksi.
 */
export async function generateRecommendations(outletId: string, outletName: string, opts: { lang?: LangCode; role?: string | null } = {}) {
  const lang = opts.lang ?? "id";
  const features = await resolveToolFeatures(outletId, opts.role);
  const [trends, forecast, anomalies, context] = await Promise.all([
    computeTrends(outletId, 30),
    computeForecast(outletId, 56, 7),
    detectAnomalies(outletId, 60),
    integratedContext(outletId, features),
  ]);
  const label = LANG_OPTIONS.find((l) => l.code === lang)?.label ?? "Bahasa Indonesia";

  const data = {
    trends30d: { revenueTrend: trends.revenueTrend, revenueDailyAverage: trends.revenueDailyAverage, expenseTrend: trends.expenseTrend, expenseDailyAverage: trends.expenseDailyAverage, last7DaysRevenue: trends.last7DaysRevenue, prev7DaysRevenue: trends.prev7DaysRevenue, wowChangePercent: trends.wowChangePercent },
    forecastNext7: { total: forecast.forecastTotal, perDay: forecast.forecast, weekdayPattern: forecast.weekdayPattern },
    costAnomalies: anomalies.categoryAnomalies.slice(0, 5),
    revenueAnomalies: anomalies.revenueAnomalies.slice(-5),
    context,
  };

  const prompt = `Data bisnis outlet "${outletName}" (rental PlayStation + F&B) sampai ${trends.until}, dalam JSON:
${clip(JSON.stringify(data), 12000)}

Sebagai analis bisnis, tulis dalam bahasa ${label}:
1) Ringkasan kondisi (maks 3 kalimat).
2) 3-5 rekomendasi aksi konkret untuk 7 hari ke depan, berpoin "- ". Hubungkan data lintas fitur: mis. hari libur/libur sekolah/hujan/pertandingan bola di Kalender Bisnis → promo, stok F&B, jadwal kasir; unit sepi → paket promo; stok menipis → belanja; shift selisih/TV offline → cek. Sebut angka dan nama hari/tanggal. Jangan mengarang data yang tidak ada; bila data kurang, katakan singkat.
Format: paragraf ringkasan lalu daftar "- ". Tanpa tabel, tanpa judul.`;

  const response = await createMessage({ model: AI_INSIGHTS_MODEL, max_tokens: 700, messages: [{ role: "user", content: prompt }] });
  await recordAiTokens(outletId, usageOf(response));
  const narrative = textOf(response);
  const generatedAt = new Date().toISOString();
  if (narrative) await saveRecommendation(outletId, { narrative, lang, generatedAt });
  return { narrative, generatedAt, cached: false, trends, forecast, anomalies };
}
