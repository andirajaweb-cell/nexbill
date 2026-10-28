/**
 * Sinkron terjadwal Kalender Bisnis — dipanggil scheduler VPS (scripts/booking-scheduler.ts, tiap
 * ±30 menit) dan, sebagai cadangan, oleh halaman Kalender Bisnis lewat after() bila datanya basi.
 * Cuaca: hanya desa yang dipakai outlet, berurutan dengan jeda ≥1,1 detik (BMKG 60 permintaan/menit/IP).
 * Sepak bola: satu sinkron untuk semua outlet, mengikuti rem kuota di football.ts.
 */
import { isNotNull } from "drizzle-orm";
import { db } from "@/db/client";
import { outletActivitySettings } from "@/db/schema";
import { refreshWeather, weatherCacheRows, weatherDue } from "./bmkg";
import { footballDue, syncLeagues, syncMatches } from "./football";
import { libDue, syncLibSchedule } from "./lib";
import { isMissingRelation } from "./http";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface SyncReport {
  weatherRefreshed: number;
  football: string;
}

export async function runActivitySync(): Promise<SyncReport> {
  const report: SyncReport = { weatherRefreshed: 0, football: "skip" };
  try {
    const rows = await db.selectDistinct({ adm4: outletActivitySettings.adm4Code }).from(outletActivitySettings).where(isNotNull(outletActivitySettings.adm4Code));
    const codes = rows.map((r) => r.adm4).filter((c): c is string => !!c);
    const cache = new Map((await weatherCacheRows(codes)).map((r) => [r.adm4Code, r]));
    for (const code of codes) {
      if (!weatherDue(cache.get(code))) continue;
      await refreshWeather(code);
      report.weatherRefreshed++;
      await sleep(1100);
    }
    if (await libDue()) {
      const r = await syncLibSchedule();
      report.football = r.ok ? `liga Indonesia ok ${r.count}` : `liga Indonesia: ${r.error}`;
    }
    if (await footballDue()) {
      await syncLeagues();
      const r = await syncMatches();
      report.football = r.ok ? `ok ${r.count}` : r.skipped ?? r.error ?? "gagal";
    }
  } catch (err) {
    if (isMissingRelation(err)) report.football = "migrasi 0039 belum dijalankan";
    else throw err;
  }
  return report;
}
