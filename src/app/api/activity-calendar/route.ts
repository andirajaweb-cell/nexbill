import { NextRequest, NextResponse, after } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { getActivitySettings } from "@/lib/activity-calendar/data";
import { buildCalendar, MAX_RANGE_DAYS, todayIn, validDate } from "@/lib/activity-calendar/calendar";
import { addDays } from "@/lib/activity-calendar/insights-rules";
import { refreshWeather, weatherCacheRow, weatherDue } from "@/lib/activity-calendar/bmkg";
import { footballDue, syncLeagues, syncMatches } from "@/lib/activity-calendar/football";
import { libDue, syncLibSchedule } from "@/lib/activity-calendar/lib";
import { isMissingRelation } from "@/lib/activity-calendar/http";

/** Refresh latar belakang (BMKG + Footballdata.io) bisa makan waktu; respons halaman tidak menunggunya. */
export const maxDuration = 60;

/**
 * Kalender Bisnis outlet sesi: GET ?from=YYYY-MM-DD&to=YYYY-MM-DD[&day=YYYY-MM-DD] (tanggal lokal outlet,
 * maks. 62 hari). Data dibaca dari cache; bila cuaca/jadwal sudah basi, pembaruan dijalankan setelah
 * respons terkirim (after) — cadangan untuk sinkron terjadwal di scheduler.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) return NextResponse.json({ error: "Role kamu tidak punya izin melihat Kalender Bisnis." }, { status: 403 });

    const settings = await getActivitySettings(session.outletId);
    const today = todayIn(settings.timezone);
    const sp = req.nextUrl.searchParams;
    let from = validDate(sp.get("from")) ? sp.get("from")! : addDays(`${today.slice(0, 8)}01`, -6);
    let to = validDate(sp.get("to")) ? sp.get("to")! : addDays(from, 41);
    if (to < from) [from, to] = [to, from];
    if (Date.parse(to) - Date.parse(from) > MAX_RANGE_DAYS * 86400_000) to = addDays(from, MAX_RANGE_DAYS);

    const data = await buildCalendar(session.outletId, settings, from, to, { day: sp.get("day") });

    // Pembaruan latar belakang bila data basi (tidak memblok respons).
    const adm4 = settings.adm4Code;
    const needWeather = adm4 ? weatherDue(await weatherCacheRow(adm4)) : false;
    const needLib = settings.showMatches && (await libDue());
    const needFootball = settings.showMatches && (await footballDue());
    if (needWeather || needFootball || needLib) {
      after(async () => {
        try {
          if (needWeather && adm4) await refreshWeather(adm4);
          if (needLib) await syncLibSchedule();
          if (needFootball) {
            await syncLeagues();
            await syncMatches();
          }
        } catch (err) {
          console.warn("[activity-calendar] refresh latar gagal:", err instanceof Error ? err.message : err);
        }
      });
    }

    return NextResponse.json({
      migration: true,
      settings,
      canEdit: hasPermission(session.role as StaffRole, "manage_settings"),
      refreshing: { weather: needWeather, football: needFootball || needLib },
      ...data,
    });
  } catch (err: unknown) {
    if (isMissingRelation(err)) return NextResponse.json({ migration: false, error: "Jalankan migrasi 0039_activity_calendar.sql di Supabase." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
