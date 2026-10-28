/**
 * Data outlet untuk Kalender Bisnis: pengaturan per outlet dan angka AKTUAL harian/per jam dari
 * transaksi. Setiap query dibatasi outletId sesi — tidak ada data lintas outlet.
 *
 * Definisi angka aktual (ditampilkan apa adanya di UI):
 *  - Sesi rental   : rental_sessions berstatus "finished", dihitung pada tanggal/jam MULAI (waktu lokal).
 *                    Ini proksi kunjungan, bukan jumlah orang unik.
 *  - Durasi        : rata-rata (selesai − mulai − jeda) sesi tersebut, menit.
 *  - Omzet         : total order selain "cancelled" pada COALESCE(business_date, created_at) — sama
 *                    dengan Penjualan Kotor di Laporan.
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { outletActivitySettings } from "@/db/schema";
import type { DailyActual } from "./insights-rules";

export interface ActivitySettings {
  adm4Code: string | null;
  locationLabel: string | null;
  timezone: string;
  leagueIds: string[] | null;
  showWeather: boolean;
  showMatches: boolean;
  updatedAt: string | null;
}

const ALLOWED_TZ = new Set(["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"]);

export function safeTimezone(tz: string | null | undefined): string {
  return tz && ALLOWED_TZ.has(tz) ? tz : "Asia/Jakarta";
}

export async function getActivitySettings(outletId: string): Promise<ActivitySettings> {
  const [row] = await db.select().from(outletActivitySettings).where(eq(outletActivitySettings.outletId, outletId)).limit(1);
  return {
    adm4Code: row?.adm4Code ?? null,
    locationLabel: row?.locationLabel ?? null,
    timezone: safeTimezone(row?.timezone),
    leagueIds: row?.leagueIds ? row.leagueIds.split(",").filter(Boolean) : null,
    showWeather: row?.showWeather ?? true,
    showMatches: row?.showMatches ?? true,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function saveActivitySettings(outletId: string, patch: Omit<ActivitySettings, "updatedAt">, by: string) {
  const now = new Date().toISOString();
  const values = {
    adm4Code: patch.adm4Code,
    locationLabel: patch.locationLabel,
    timezone: safeTimezone(patch.timezone),
    leagueIds: patch.leagueIds && patch.leagueIds.length > 0 ? patch.leagueIds.join(",") : null,
    showWeather: patch.showWeather,
    showMatches: patch.showMatches,
    updatedBy: by,
    updatedAt: now,
  };
  await db.insert(outletActivitySettings).values({ outletId, ...values }).onConflictDoUpdate({ target: outletActivitySettings.outletId, set: values });
}

/** Batas UTC (ISO) dari rentang tanggal lokal [fromDate, toDate] — dilebarkan 1 hari agar aman lintas zona. */
function utcBounds(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 1);
  const to = new Date(`${toDate}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + 2);
  return { fromUtc: from.toISOString(), toUtc: to.toISOString() };
}

/** Aktual harian outlet (tanggal lokal) dalam rentang inklusif. */
export async function dailyActuals(outletId: string, fromDate: string, toDate: string, tz: string): Promise<DailyActual[]> {
  const zone = safeTimezone(tz);
  const { fromUtc, toUtc } = utcBounds(fromDate, toDate);
  const sessions = (await db.execute(sql`
    SELECT to_char((started_at::timestamptz AT TIME ZONE ${zone}), 'YYYY-MM-DD') AS d,
           count(*)::int AS n,
           avg(GREATEST(0, extract(epoch from (ended_at::timestamptz - started_at::timestamptz)) / 60 - coalesce(accumulated_pause_ms, 0) / 60000.0))::float AS dur
    FROM rental_sessions
    WHERE outlet_id = ${outletId} AND status = 'finished' AND ended_at IS NOT NULL
      AND started_at >= ${fromUtc} AND started_at < ${toUtc}
    GROUP BY 1
  `)) as unknown as { d: string; n: number; dur: number | null }[];
  const revenue = (await db.execute(sql`
    SELECT to_char((coalesce(business_date, created_at)::timestamptz AT TIME ZONE ${zone}), 'YYYY-MM-DD') AS d,
           sum(total)::float AS rev
    FROM orders
    WHERE outlet_id = ${outletId} AND status <> 'cancelled'
      AND coalesce(business_date, created_at) >= ${fromUtc} AND coalesce(business_date, created_at) < ${toUtc}
    GROUP BY 1
  `)) as unknown as { d: string; rev: number | null }[];
  const map = new Map<string, DailyActual>();
  const get = (d: string) => {
    if (!map.has(d)) map.set(d, { date: d, sessions: 0, revenue: 0, avgDurationMin: null });
    return map.get(d)!;
  };
  for (const r of rowsOf(sessions)) {
    const a = get(r.d);
    a.sessions = Number(r.n) || 0;
    a.avgDurationMin = r.dur == null ? null : Math.round(Number(r.dur));
  }
  for (const r of rowsOf(revenue)) get(r.d).revenue = Math.round(Number(r.rev) || 0);
  return [...map.values()].filter((a) => a.date >= fromDate && a.date <= toDate).sort((a, b) => a.date.localeCompare(b.date));
}

/** Jumlah sesi per jam lokal (0–23) untuk satu tanggal — tampilan harian. */
export async function hourlySessions(outletId: string, date: string, tz: string): Promise<number[]> {
  const zone = safeTimezone(tz);
  const { fromUtc, toUtc } = utcBounds(date, date);
  const rows = (await db.execute(sql`
    SELECT extract(hour from (started_at::timestamptz AT TIME ZONE ${zone}))::int AS h, count(*)::int AS n
    FROM rental_sessions
    WHERE outlet_id = ${outletId} AND status IN ('finished', 'running', 'paused')
      AND started_at >= ${fromUtc} AND started_at < ${toUtc}
      AND to_char((started_at::timestamptz AT TIME ZONE ${zone}), 'YYYY-MM-DD') = ${date}
    GROUP BY 1
  `)) as unknown as { h: number; n: number }[];
  const out = Array.from({ length: 24 }, () => 0);
  for (const r of rowsOf(rows)) if (r.h >= 0 && r.h < 24) out[r.h] = Number(r.n) || 0;
  return out;
}

/** db.execute di postgres-js mengembalikan array; driver lain bisa { rows }. */
function rowsOf<T>(res: T[] | { rows?: T[] }): T[] {
  return Array.isArray(res) ? res : (res.rows ?? []);
}
