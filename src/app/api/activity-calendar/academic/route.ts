import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { academicBetween, createAcademic, getCalendarPrefs } from "@/lib/activity-calendar/academic";
import { parseAcademicInput } from "@/lib/activity-calendar/academic-rules";
import { isMissingRelation } from "@/lib/activity-calendar/http";
import { validDate } from "@/lib/activity-calendar/calendar";
import { addDays } from "@/lib/activity-calendar/insights-rules";

const MIGRATION = "Jalankan migrasi 0040_activity_holidays_academic.sql di Supabase.";

/**
 * Kalender akademik outlet sesi — GET ?from&to (bawaan: 60 hari lalu s.d. 1 tahun ke depan), POST tambah.
 * Selalu outlet sesi; jadwal outlet lain tidak pernah terbaca atau berubah.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "view_reports")) return NextResponse.json({ error: "Tidak punya izin." }, { status: 403 });
    const today = new Date().toISOString().slice(0, 10);
    const sp = req.nextUrl.searchParams;
    const from = validDate(sp.get("from")) ? sp.get("from")! : addDays(today, -60);
    const to = validDate(sp.get("to")) ? sp.get("to")! : addDays(today, 366);
    const prefs = await getCalendarPrefs(session.outletId);
    if (!prefs.ready) return NextResponse.json({ ready: false, items: [], province: prefs.province, canEdit: false, error: MIGRATION });
    return NextResponse.json({
      ready: true,
      province: prefs.province,
      canEdit: hasPermission(session.role as StaffRole, "manage_settings"),
      items: await academicBetween(session.outletId, from, to),
    });
  } catch (err: unknown) {
    if (isMissingRelation(err)) return NextResponse.json({ ready: false, error: MIGRATION }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) return NextResponse.json({ error: "Hanya peran dengan izin Pengaturan yang bisa mengisi kalender akademik." }, { status: 403 });
    const parsed = parseAcademicInput(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const prefs = await getCalendarPrefs(session.outletId);
    if (!prefs.ready) return NextResponse.json({ error: MIGRATION }, { status: 503 });
    const item = await createAcademic(session.outletId, parsed.value, prefs.province, session.name);
    return NextResponse.json({ item });
  } catch (err: unknown) {
    if (isMissingRelation(err)) return NextResponse.json({ error: MIGRATION }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
