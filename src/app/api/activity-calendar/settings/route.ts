import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { getActivitySettings, safeTimezone, saveActivitySettings } from "@/lib/activity-calendar/data";
import { refreshWeather, getWeather } from "@/lib/activity-calendar/bmkg";
import { isValidAdm4, locationLabel } from "@/lib/activity-calendar/bmkg-rules";
import { cachedLeagues, footballConfigured, footballStatus, syncLeagues } from "@/lib/activity-calendar/football";
import { hasIndonesianLeague, sortLeagues } from "@/lib/activity-calendar/football-rules";
import { isMissingRelation } from "@/lib/activity-calendar/http";

export const maxDuration = 30;

/** GET: pengaturan + liga yang tersedia di paket API + status Footballdata.io (tanpa API key). */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
    const settings = await getActivitySettings(session.outletId);
    let leagues = await cachedLeagues();
    if (leagues.length === 0 && footballConfigured()) leagues = await syncLeagues();
    leagues = sortLeagues(leagues);
    return NextResponse.json({
      settings,
      canEdit: hasPermission(session.role as StaffRole, "manage_settings"),
      leagues,
      indonesianLeagueAvailable: hasIndonesianLeague(leagues),
      football: await footballStatus(),
    });
  } catch (err: unknown) {
    if (isMissingRelation(err)) return NextResponse.json({ migration: false, error: "Jalankan migrasi 0039_activity_calendar.sql di Supabase." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/**
 * PUT { adm4Code, leagueIds[], showWeather, showMatches } — hanya peran dengan izin Pengaturan.
 * Lokasi baru langsung dicek ke BMKG: kode yang tidak dikenal BMKG ditolak (tidak disimpan diam-diam).
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) return NextResponse.json({ error: "Hanya peran dengan izin Pengaturan yang bisa mengubah Kalender Bisnis." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const current = await getActivitySettings(session.outletId);

    const rawCode = typeof body.adm4Code === "string" ? body.adm4Code.trim() : null;
    if (rawCode && !isValidAdm4(rawCode)) return NextResponse.json({ error: "Kode wilayah harus format desa/kelurahan, mis. 31.71.03.1001." }, { status: 400 });
    let adm4Code = rawCode || null;
    let label = current.locationLabel;
    let timezone = current.timezone;
    if (adm4Code && adm4Code !== current.adm4Code) {
      await refreshWeather(adm4Code);
      const w = await getWeather(adm4Code);
      if (!w.snapshot) return NextResponse.json({ error: w.error ?? "BMKG belum memberi prakiraan untuk lokasi ini." }, { status: 422 });
      label = locationLabel(w.snapshot.location) || adm4Code;
      timezone = safeTimezone(w.snapshot.timezone);
    }
    if (!adm4Code) {
      adm4Code = null;
      label = null;
    }

    const leagueIds = Array.isArray(body.leagueIds)
      ? [...new Set(body.leagueIds.filter((x: unknown): x is string => typeof x === "string" && /^[\w-]{1,32}$/.test(x)))].slice(0, 60) as string[]
      : current.leagueIds;

    await saveActivitySettings(
      session.outletId,
      {
        adm4Code,
        locationLabel: label,
        timezone,
        leagueIds,
        showWeather: typeof body.showWeather === "boolean" ? body.showWeather : current.showWeather,
        showMatches: typeof body.showMatches === "boolean" ? body.showMatches : current.showMatches,
      },
      session.name
    );
    return NextResponse.json({ settings: await getActivitySettings(session.outletId) });
  } catch (err: unknown) {
    if (isMissingRelation(err)) return NextResponse.json({ error: "Jalankan migrasi 0039_activity_calendar.sql di Supabase." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
