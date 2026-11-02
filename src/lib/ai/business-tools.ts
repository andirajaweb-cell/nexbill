import Anthropic from "@anthropic-ai/sdk";
import { and, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { bookings, fixedAssets, products, promos, rentalSessions, rentalUnits, shifts, staffUsers } from "@/db/schema";
import { computeSalesReport, computeRentalReport, computeInventoryReport, computeCustomerReport, dailyRecognizedRevenue } from "@/lib/reports/operational";
import { computeExpenseReport, computeExpenseDashboard } from "@/lib/reports/expense";
import { computeProfitLoss, computeBalanceSheet, computeTrialBalance } from "@/lib/accounting/reports";
import { computeCashFlow } from "@/lib/accounting/cashflow";
import { computeFinancialHealth } from "@/lib/reports/financial-health";
import { computeCashierPerformance } from "@/lib/reports/transactions";
import { normalizeReportRange } from "@/lib/reports/range";
import { computePpobSummary } from "@/lib/ppob/reports";
import { getHomeRentalDashboardSummary } from "@/lib/home-rental/rentals";
import { listTvConnection } from "@/lib/tv/service";
import { tvConnState, minutesSince } from "@/lib/tv/connection-rules";
import { getTvWatch } from "@/lib/tv/tv-watch";
import { getActivitySettings } from "@/lib/activity-calendar/data";
import { getCalendarPrefs } from "@/lib/activity-calendar/academic";
import { buildCalendar, todayIn } from "@/lib/activity-calendar/calendar";
import { addDays } from "@/lib/activity-calendar/insights-rules";
import { isMissingRelation } from "@/lib/activity-calendar/http";
import { isPrimeTime } from "@/lib/activity-calendar/football-rules";
import { getOutletEntitlements } from "@/lib/subscription/service";
import { FEATURE_LABEL_ID, type PlanFeature } from "@/lib/subscription/pricing";
import { outletDateYmd, outletDayEndUtc, outletDayStartUtc } from "@/lib/time/outlet-time";
import { clip } from "./quota-rules";

/**
 * Tool baca-saja untuk AI Business Assistant — terpisah dari src/lib/ai/tools.ts (bot pelanggan
 * Instagram, yang bisa menulis pre-order). Setiap tool membungkus fungsi laporan/fitur yang sudah
 * ada, dibatasi ke outlet percakapan itu, dan TIDAK PERNAH mengubah data.
 *
 * Terintegrasi dengan fitur NEXBILL: Rental PS & sesi berjalan, booking, shift & anti-fraud,
 * performa kasir, NEXBILL TV, Kalender Bisnis (cuaca BMKG, libur nasional, kalender akademik, jadwal
 * bola), PPOB, Rental ke Rumah, promo, stok, akuntansi, aset, kesehatan keuangan.
 *
 * Aturan paket tetap berlaku: tool fitur Pro (mis. Pembukuan Lengkap, Kalender Bisnis, PPOB) di
 * outlet Starter menjawab {locked:true} — AI menjelaskan bahwa itu fitur Pro, bukan membocorkan data.
 *
 * Perbaikan 2026-11-02: tanggal dari AI ("2026-11-02") dulu dioper mentah ke laporan sehingga hari
 * terakhir periode hilang (perbandingan string dengan timestamp ISO) — "penjualan hari ini" selalu
 * 0. Sekarang lewat normalizeReportRange (batas hari WIB). Hasil tool juga diringkas & dipotong agar
 * token (COGS) tidak membengkak.
 */

const periodProps = {
  from: { type: "string", description: "Tanggal mulai YYYY-MM-DD (kalender outlet). Kosongkan bersama 'to' untuk bulan berjalan." },
  to: { type: "string", description: "Tanggal akhir YYYY-MM-DD (inklusif)." },
};

export const businessToolDefinitions: Anthropic.Tool[] = [
  {
    name: "get_today_snapshot",
    description:
      "Kondisi outlet SAAT INI: status semua unit PS (kosong/dipakai/booked/maintenance), sesi rental yang sedang berjalan & sisa waktunya, pendapatan hari ini, shift kasir yang terbuka, booking hari ini, koneksi layar NEXBILL TV, dan jumlah produk stok menipis. Pakai untuk pertanyaan 'sekarang', 'hari ini', 'lagi ramai?'.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_sales_report",
    description: "Ringkasan penjualan: total revenue rental vs POS/F&B, jumlah order, diskon, pajak, service charge, tren harian, dan per metode pembayaran, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_rental_report",
    description: "Performa rental per unit PS: jumlah sesi, revenue, rata-rata durasi per unit, dan total utilisasi, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_inventory_report",
    description: "Inventori & HPP F&B/produk: qty terjual, revenue, HPP, margin per produk, barang waste, dan produk stok menipis, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_customer_report",
    description: "Top pelanggan berdasarkan total belanja, jumlah kunjungan dalam periode, dan distribusi tier membership.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_bookings",
    description: "Booking/reservasi unit PS dalam periode (default 7 hari ke depan): daftar jadwal, status (pending/confirmed/checked_in/completed/no_show/cancelled), sumber (kasir/online/WhatsApp), DP, dan tingkat no-show.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_business_calendar",
    description:
      "Kalender Bisnis outlet untuk N hari ke depan (maks 14): prakiraan cuaca BMKG (jam hujan), libur nasional & cuti bersama, kalender akademik (libur sekolah, UTS/UAS) yang diisi outlet, jadwal pertandingan bola prime time, perkiraan baseline sesi/omzet, dan analisa historis pengaruh hujan/bola/libur/ujian terhadap omzet. Pakai untuk perencanaan promo, stok, jadwal staf.",
    input_schema: { type: "object", properties: { days: { type: "number", description: "Jumlah hari ke depan, 1-14 (default 7)." } } },
  },
  {
    name: "get_shift_review",
    description: "Ringkasan shift kasir dalam periode: jumlah shift, selisih kas (variance) per shift, siapa kasirnya, dan tanda risiko anti-fraud (void/diskon berlebih, selisih kas, ditutup orang lain).",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_cashier_performance",
    description: "Performa per kasir dalam periode: jumlah transaksi, total penjualan, rata-rata transaksi, rental vs F&B, refund, void, diskon, jumlah shift, total selisih kas, peringkat.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_nexbill_tv_status",
    description: "Status layar NEXBILL TV per unit (online/offline/belum dipasang, versi aplikasi, menit sejak terakhir terlihat), aksi kasir di TV yang gagal tersinkron, dan sesi uji staf 7 hari terakhir.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_promos",
    description: "Daftar promo/paket rental/happy hour/voucher yang aktif beserta harga, diskon, dan masa berlaku.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_expense_report",
    description: "Laporan biaya lengkap: total per kategori, akun, supplier, metode bayar, cost center, rasio biaya terhadap revenue, dan tren, untuk suatu periode (hanya biaya approved/paid).",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_expense_dashboard",
    description: "Ringkasan biaya saat ini: total hari ini, bulan ini, hutang belum dibayar, pending approval, dan biaya jatuh tempo 3 hari.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_profit_loss",
    description: "Laba Rugi: total revenue, biaya per akun, laba kotor, laba bersih, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_financial_health",
    description: "Kesehatan keuangan: margin kotor/bersih, pencapaian target penjualan (BEP), likuiditas (kas & bank vs hutang lancar), untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_balance_sheet",
    description: "Neraca per tanggal: total aset, kewajiban, ekuitas.",
    input_schema: { type: "object", properties: { asOf: { type: "string", description: "Per tanggal YYYY-MM-DD, default hari ini." } } },
  },
  {
    name: "get_cash_flow",
    description: "Arus kas: kas masuk, kas keluar, arus kas bersih, per kategori dan tren harian, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_fixed_assets_summary",
    description: "Aset tetap: daftar aset aktif, harga perolehan, akumulasi penyusutan, nilai buku.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_ppob_summary",
    description: "Ringkasan PPOB (pulsa, token listrik, tagihan): total transaksi, fee admin/margin, hutang ke provider, dan saldo deposit provider, untuk suatu periode.",
    input_schema: { type: "object", properties: periodProps },
  },
  {
    name: "get_home_rental_summary",
    description: "Rental ke Rumah (sewa konsol bawa pulang): rental aktif, jatuh tempo hari ini, terlambat, aset tersedia/hilang, deposit ditahan, piutang.",
    input_schema: { type: "object", properties: {} },
  },
];

/** Tool → fitur paket yang wajib dimiliki outlet. */
const TOOL_FEATURE: Partial<Record<string, PlanFeature>> = {
  get_profit_loss: "profit_report",
  get_financial_health: "accounting",
  get_balance_sheet: "accounting",
  get_cash_flow: "accounting",
  get_fixed_assets_summary: "assets",
  get_expense_report: "expenses",
  get_expense_dashboard: "expenses",
  get_business_calendar: "activity_calendar",
  get_ppob_summary: "ppob",
  get_home_rental_summary: "home_rental",
};

export interface ToolContext {
  outletId: string;
  /** Superuser (akun internal NEXBILL) melihat semua fitur. */
  role?: string | null;
  features?: PlanFeature[] | null;
}

/** Batas karakter hasil satu tool (≈ 2.000 token). */
export const TOOL_RESULT_MAX_CHARS = 8000;
const MAX_ARRAY = 25;

/** Ringkas objek: array panjang dipotong (dengan catatan), angka dibulatkan. */
export function compactForAi(value: unknown, depth = 0): unknown {
  if (Array.isArray(value)) {
    const items = value.slice(0, MAX_ARRAY).map((v) => compactForAi(v, depth + 1));
    return value.length > MAX_ARRAY ? [...items, `…${value.length - MAX_ARRAY} baris lain tidak ditampilkan`] : items;
  }
  if (typeof value === "number") return Number.isInteger(value) ? value : Math.round(value * 100) / 100;
  if (value && typeof value === "object") {
    if (depth > 6) return "[…]";
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v === null || v === undefined) continue;
      out[k] = compactForAi(v, depth + 1);
    }
    return out;
  }
  return value;
}

function range(input: { from?: unknown; to?: unknown }, fallback: "month" | "next7" = "month") {
  const from = typeof input?.from === "string" ? input.from : undefined;
  const to = typeof input?.to === "string" ? input.to : undefined;
  if (!from && !to) {
    const today = outletDateYmd(new Date());
    if (fallback === "next7") return normalizeReportRange(today, addDays(today, 6)) as { from: string; to: string };
    return normalizeReportRange(`${today.slice(0, 7)}-01`, today) as { from: string; to: string };
  }
  return normalizeReportRange(from ?? null, to ?? null);
}

async function staffNames(outletId: string): Promise<Map<string, string>> {
  const rows = await db.select({ id: staffUsers.id, name: staffUsers.name }).from(staffUsers).where(eq(staffUsers.outletId, outletId));
  return new Map(rows.map((r) => [r.id, r.name]));
}

function parseFlags(raw: string | null): { code: string; label: string; severity: string }[] {
  try {
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ tool baru (integrasi) */

export async function todaySnapshot(outletId: string) {
  const now = Date.now();
  const dayStart = outletDayStartUtc().toISOString();
  const dayEnd = outletDayEndUtc().toISOString();
  const today = outletDateYmd(new Date());
  const [units, running, revenueMap, openShifts, todayBookings, tv, lowStock, names] = await Promise.all([
    db.select({ id: rentalUnits.id, name: rentalUnits.name, consoleType: rentalUnits.consoleType, status: rentalUnits.status }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true))),
    db.select().from(rentalSessions).where(and(eq(rentalSessions.outletId, outletId), inArray(rentalSessions.status, ["running", "paused"]))),
    dailyRecognizedRevenue(outletId, dayStart, dayEnd),
    db.select({ staffUserId: shifts.staffUserId, openedAt: shifts.openedAt, openingCash: shifts.openingCash }).from(shifts).where(and(eq(shifts.outletId, outletId), eq(shifts.status, "open"))),
    db.select().from(bookings).where(and(eq(bookings.outletId, outletId), gte(bookings.scheduledStart, dayStart), lt(bookings.scheduledStart, dayEnd))).orderBy(bookings.scheduledStart),
    listTvConnection(outletId).catch(() => []),
    db.select({ name: products.name, stockQty: products.stockQty, lowStockThreshold: products.lowStockThreshold }).from(products).where(and(eq(products.outletId, outletId), eq(products.isActive, true))),
    staffNames(outletId),
  ]);
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const statusCount: Record<string, number> = {};
  for (const u of units) statusCount[u.status] = (statusCount[u.status] ?? 0) + 1;
  const tvByUnit = new Map(tv.map((t) => [t.unitId, t]));
  const low = lowStock.filter((p) => p.lowStockThreshold != null && p.stockQty != null && p.stockQty <= p.lowStockThreshold);
  return {
    now: new Date(now).toISOString(),
    today,
    units: { total: units.length, byStatus: statusCount },
    runningSessions: running.map((s) => {
      const pauseMs = s.accumulatedPauseMs + (s.status === "paused" && s.pausedAt ? now - new Date(s.pausedAt).getTime() : 0);
      const elapsed = Math.max(0, Math.round((now - new Date(s.startedAt).getTime() - pauseMs) / 60000));
      const planned = s.plannedMinutes != null ? s.plannedMinutes + (s.extendedMinutes ?? 0) : null;
      return {
        unit: unitName.get(s.rentalUnitId) ?? s.rentalUnitId,
        status: s.status,
        customer: s.customerName,
        startedAt: s.startedAt,
        elapsedMinutes: elapsed,
        plannedMinutes: planned,
        remainingMinutes: planned != null ? planned - elapsed : null,
        game: s.gameName,
      };
    }),
    revenueToday: revenueMap.get(today) ?? 0,
    openShifts: openShifts.map((s) => ({ cashier: names.get(s.staffUserId) ?? "?", openedAt: s.openedAt, openingCash: s.openingCash })),
    bookingsToday: {
      total: todayBookings.length,
      active: todayBookings.filter((b) => ["pending", "confirmed", "checked_in"].includes(b.status)).length,
      list: todayBookings.slice(0, 15).map((b) => ({ start: b.scheduledStart, end: b.scheduledEnd, unit: b.rentalUnitId ? unitName.get(b.rentalUnitId) : b.consoleType, customer: b.customerName, status: b.status, source: b.source })),
    },
    nexbillTv: {
      screens: tv.length,
      online: tv.filter((t) => tvConnState(t.lastSeenAt, now, t.isPaired) === "online").length,
      offlineUnits: units
        .filter((u) => {
          const t = tvByUnit.get(u.id);
          return t && tvConnState(t.lastSeenAt, now, t.isPaired) === "offline";
        })
        .map((u) => u.name),
    },
    lowStockCount: low.length,
    lowStockItems: low.slice(0, 10).map((p) => `${p.name} (${p.stockQty})`),
  };
}

export async function businessCalendarSummary(outletId: string, days = 7) {
  const n = Math.min(14, Math.max(1, Math.round(days) || 7));
  try {
    const settings = await getActivitySettings(outletId);
    const prefs = await getCalendarPrefs(outletId);
    const today = todayIn(settings.timezone);
    const to = addDays(today, n - 1);
    const cal = await buildCalendar(outletId, settings, today, to, { prefs });
    const primeByDay = new Map<string, number>();
    for (const m of cal.football.matches) if (isPrimeTime(Number(m.localTime.slice(0, 2))) && m.localDate >= today && m.localDate <= to) primeByDay.set(m.localDate, (primeByDay.get(m.localDate) ?? 0) + 1);
    const comparisons = (block: { coveredDays: number; comparisons: { metric: string; diffPct: number | null; direction: string }[] } | null | undefined) =>
      block ? { coveredDays: block.coveredDays, effect: block.comparisons.filter((c) => c.direction !== "insufficient").map((c) => ({ metric: c.metric, diffPct: c.diffPct, direction: c.direction })) } : null;
    return {
      today,
      days: n,
      weatherConfigured: cal.weather.configured,
      location: cal.weather.locationLabel,
      next7: cal.insights.next7.map((d) => ({
        date: d.date,
        holidays: d.holidays.map((h) => h.name),
        academic: d.academic.map((a) => `${a.title} (${a.level})`),
        rain: d.weather ? { slots: d.weather.rainSlots, worst: d.weather.worstRain, hours: d.weather.rainHours, tempMax: d.weather.tempMax } : null,
        primeTimeMatches: d.primeTimeMatches,
        firstPrimeKickoff: d.firstPrimeKickoff,
        baseline: d.baseline ? { sessions: Math.round(d.baseline.sessions * 10) / 10, revenue: Math.round(d.baseline.revenue), sampleDays: d.baseline.n } : null,
      })),
      laterDays: n > 7
        ? {
            holidays: cal.holidays.items.filter((h) => h.date > addDays(today, 6)).map((h) => ({ date: h.date, name: h.name })),
            academic: cal.academic.items.filter((a) => a.endDate > addDays(today, 6)).map((a) => ({ from: a.startDate, to: a.endDate, title: a.title, kind: a.kind })),
            primeTimeMatchesByDay: Object.fromEntries([...primeByDay.entries()].filter(([d]) => d > addDays(today, 6))),
          }
        : undefined,
      historicalEffect: {
        rain: comparisons(cal.insights.rain),
        footballMatch: comparisons(cal.insights.match),
        holiday: comparisons(cal.insights.holiday),
        schoolHoliday: comparisons(cal.insights.schoolHoliday),
        exam: comparisons(cal.insights.exam),
      },
      note: "baseline = rata-rata hari yang sama dalam seminggu (8 minggu terakhir). historicalEffect.diffPct = selisih % hari dengan kondisi vs tanpa kondisi.",
    };
  } catch (err) {
    if (isMissingRelation(err)) return { available: false, reason: "Kalender Bisnis belum disiapkan (migrasi 0039/0040 belum dijalankan)." };
    throw err;
  }
}

async function bookingsSummary(outletId: string, input: { from?: unknown; to?: unknown }) {
  const r = range(input, "next7");
  const where = [eq(bookings.outletId, outletId)];
  if (r.from) where.push(gte(bookings.scheduledStart, r.from));
  if (r.to) where.push(lte(bookings.scheduledStart, r.to));
  const [rows, units] = await Promise.all([
    db.select().from(bookings).where(and(...where)).orderBy(bookings.scheduledStart).limit(300),
    db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(eq(rentalUnits.outletId, outletId)),
  ]);
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const b of rows) {
    byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;
    bySource[b.source] = (bySource[b.source] ?? 0) + 1;
  }
  const settled = (byStatus.completed ?? 0) + (byStatus.checked_in ?? 0) + (byStatus.no_show ?? 0);
  return {
    from: r.from,
    to: r.to,
    total: rows.length,
    byStatus,
    bySource,
    noShowRatePct: settled > 0 ? Math.round(((byStatus.no_show ?? 0) / settled) * 1000) / 10 : null,
    dpPaid: rows.filter((b) => b.dpPaid).length,
    list: rows.slice(0, 30).map((b) => ({ start: b.scheduledStart, end: b.scheduledEnd, unit: b.rentalUnitId ? unitName.get(b.rentalUnitId) : b.consoleType, customer: b.customerName, status: b.status, source: b.source, dpPaid: b.dpPaid })),
  };
}

async function shiftReview(outletId: string, input: { from?: unknown; to?: unknown }, antiFraud: boolean) {
  const r = range(input);
  const where = [eq(shifts.outletId, outletId)];
  if (r.from) where.push(gte(shifts.openedAt, r.from));
  if (r.to) where.push(lte(shifts.openedAt, r.to));
  const [rows, names] = await Promise.all([db.select().from(shifts).where(and(...where)).orderBy(desc(shifts.openedAt)).limit(200), staffNames(outletId)]);
  const closed = rows.filter((s) => s.status === "closed");
  const flagged = closed.map((s) => ({ s, flags: parseFlags(s.riskFlags) })).filter((x) => x.flags.length > 0);
  return {
    from: r.from,
    to: r.to,
    shifts: rows.length,
    open: rows.length - closed.length,
    totalCashVariance: closed.reduce((s, x) => s + (x.variance ?? 0), 0),
    shortShifts: closed.filter((s) => (s.variance ?? 0) < 0).length,
    flaggedShifts: antiFraud ? flagged.length : undefined,
    antiFraudNote: antiFraud ? undefined : "Tanda risiko shift otomatis adalah fitur Kontrol Anti-Fraud (paket Pro).",
    list: rows.slice(0, 20).map((s) => ({
      cashier: names.get(s.staffUserId) ?? "?",
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      status: s.status,
      expectedCash: s.expectedCash,
      actualCash: s.actualCash,
      variance: s.variance,
      flags: antiFraud ? parseFlags(s.riskFlags).map((f) => f.label) : undefined,
    })),
  };
}

async function tvStatus(outletId: string) {
  const now = Date.now();
  const [conn, units, watch] = await Promise.all([
    listTvConnection(outletId),
    db.select({ id: rentalUnits.id, name: rentalUnits.name }).from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true))),
    getTvWatch(outletId).catch(() => ({ failed: [], staffTests: [] })),
  ]);
  const unitName = new Map(units.map((u) => [u.id, u.name]));
  return {
    screens: conn.map((c) => ({
      unit: unitName.get(c.unitId) ?? c.unitId,
      screen: c.screenName,
      state: tvConnState(c.lastSeenAt, now, c.isPaired),
      minutesSinceSeen: minutesSince(c.lastSeenAt, now),
      appVersion: c.appVersion,
    })),
    unitsWithoutTv: units.filter((u) => !conn.some((c) => c.unitId === u.id)).map((u) => u.name),
    failedCashierActions: { count: watch.failed.length, recent: watch.failed.slice(0, 5).map((f) => ({ at: f.occurredAt, kind: f.kind, device: f.device, error: f.error })) },
    staffTests7d: { count: watch.staffTests.length, minutes: watch.staffTests.reduce((s, t) => s + t.minutes, 0) },
  };
}

async function promoList(outletId: string) {
  const rows = await db.select().from(promos).where(and(eq(promos.outletId, outletId), eq(promos.isActive, true)));
  const today = new Date().toISOString();
  return rows
    .filter((p) => !p.validUntil || p.validUntil >= today.slice(0, 10))
    .map((p) => ({ name: p.name, type: p.type, console: p.consoleType, durationMinutes: p.durationMinutes, packagePrice: p.packagePrice, discountPercent: p.discountPercent, discountAmount: p.discountAmount, code: p.code, validFrom: p.validFrom, validUntil: p.validUntil, description: p.description }));
}

/* ------------------------------------------------------------------ eksekusi */

async function run(name: string, input: Record<string, unknown>, ctx: ToolContext, features: Set<PlanFeature> | null): Promise<unknown> {
  const outletId = ctx.outletId;
  const has = (f: PlanFeature) => !features || features.has(f);
  const r = () => range(input);
  switch (name) {
    case "get_today_snapshot":
      return todaySnapshot(outletId);
    case "get_sales_report": {
      const x = r();
      const rep = await computeSalesReport(outletId, x.from, x.to);
      // Bagian akuntansi hanya untuk outlet yang punya Pembukuan Lengkap.
      return has("accounting") ? rep : { ...rep, accounting: undefined };
    }
    case "get_rental_report": {
      const x = r();
      return computeRentalReport(outletId, x.from, x.to);
    }
    case "get_inventory_report": {
      const x = r();
      return computeInventoryReport(outletId, x.from, x.to);
    }
    case "get_customer_report": {
      const x = r();
      return computeCustomerReport(outletId, x.from, x.to);
    }
    case "get_bookings":
      return bookingsSummary(outletId, input);
    case "get_business_calendar":
      return businessCalendarSummary(outletId, typeof input.days === "number" ? input.days : 7);
    case "get_shift_review":
      return shiftReview(outletId, input, has("anti_fraud"));
    case "get_cashier_performance": {
      const x = r();
      return computeCashierPerformance(outletId, x.from, x.to);
    }
    case "get_nexbill_tv_status":
      return tvStatus(outletId);
    case "get_promos":
      return promoList(outletId);
    case "get_expense_report": {
      const x = r();
      return computeExpenseReport(outletId, x.from, x.to);
    }
    case "get_expense_dashboard":
      return computeExpenseDashboard(outletId);
    case "get_profit_loss": {
      const x = r();
      return computeProfitLoss(outletId, x.from, x.to);
    }
    case "get_financial_health": {
      const x = r();
      return computeFinancialHealth(outletId, x.from!, x.to!);
    }
    case "get_balance_sheet": {
      const asOf = typeof input.asOf === "string" ? normalizeReportRange(null, input.asOf).to : undefined;
      return computeBalanceSheet(outletId, asOf);
    }
    case "get_cash_flow": {
      const x = r();
      return computeCashFlow(outletId, x.from, x.to);
    }
    case "get_fixed_assets_summary": {
      const rows = await db.select().from(fixedAssets).where(eq(fixedAssets.outletId, outletId));
      return rows.map((a) => ({
        name: a.name,
        category: a.category,
        status: a.status,
        acquisitionCost: a.acquisitionCost,
        accumulatedDepreciation: a.accumulatedDepreciation,
        bookValue: a.acquisitionCost - a.accumulatedDepreciation,
      }));
    }
    case "get_ppob_summary": {
      const x = r();
      return computePpobSummary(outletId, x.from, x.to);
    }
    case "get_home_rental_summary":
      return getHomeRentalDashboardSummary(outletId);
    default:
      return { error: `Unknown tool ${name}` };
  }
}

/** Siapkan daftar fitur outlet sekali per percakapan (dipakai executeBusinessTool). */
export async function resolveToolFeatures(outletId: string, role?: string | null): Promise<PlanFeature[] | null> {
  if (role === "superuser") return null;
  const { entitlements } = await getOutletEntitlements(outletId);
  return entitlements.features;
}

export async function executeBusinessTool(name: string, input: unknown, ctx: ToolContext): Promise<string> {
  const features = ctx.features === undefined ? await resolveToolFeatures(ctx.outletId, ctx.role) : ctx.features;
  const set = features ? new Set(features) : null;
  const need = TOOL_FEATURE[name];
  if (need && set && !set.has(need)) {
    return JSON.stringify({ locked: true, feature: FEATURE_LABEL_ID[need], message: `Data ini bagian dari fitur "${FEATURE_LABEL_ID[need]}" di paket NEXBILL Pro — outlet ini belum memilikinya.` });
  }
  try {
    const data = await run(name, (input && typeof input === "object" ? input : {}) as Record<string, unknown>, ctx, set);
    return clip(JSON.stringify(compactForAi(data)), TOOL_RESULT_MAX_CHARS);
  } catch (err) {
    console.warn(`[ai-tool] ${name} gagal:`, err instanceof Error ? err.message : err);
    return JSON.stringify({ error: "Data ini sedang tidak bisa dibaca. Sampaikan ke pengguna dan sarankan membuka halaman terkait di dashboard." });
  }
}

/** Exposed for the AI Insights engine (trend/forecast/anomaly), which needs the same trial-balance access without going through the chat tool loop. */
export { computeTrialBalance };
