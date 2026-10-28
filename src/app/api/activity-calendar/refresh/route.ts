import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { getActivitySettings } from "@/lib/activity-calendar/data";
import { refreshWeather, weatherCacheRow } from "@/lib/activity-calendar/bmkg";
import { footballStatus, syncLeagues, syncMatches } from "@/lib/activity-calendar/football";

export const maxDuration = 60;

/** Jarak minimal "Perbarui sekarang" — melindungi kuota Footballdata.io & batas BMKG dari klik berulang. */
const MIN_MANUAL_GAP_MS = 15 * 60_000;

/** POST — perbarui cuaca outlet ini & jadwal pertandingan sekarang (izin Pengaturan). */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
    const settings = await getActivitySettings(session.outletId);
    const result: { weather: string; football: string } = { weather: "skip", football: "skip" };

    if (settings.adm4Code) {
      const row = await weatherCacheRow(settings.adm4Code);
      const recent = row?.lastAttemptAt && Date.now() - new Date(row.lastAttemptAt).getTime() < MIN_MANUAL_GAP_MS;
      if (recent) result.weather = "recent";
      else {
        await refreshWeather(settings.adm4Code);
        result.weather = "ok";
      }
    }
    if (settings.showMatches) {
      const st = await footballStatus();
      const recent = st.lastSuccessAt && Date.now() - new Date(st.lastSuccessAt).getTime() < MIN_MANUAL_GAP_MS;
      if (!st.configured) result.football = "not_configured";
      else if (recent) result.football = "recent";
      else {
        await syncLeagues(true);
        const r = await syncMatches({ force: true });
        result.football = r.ok ? "ok" : r.error ?? r.skipped ?? "error";
      }
    }
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
