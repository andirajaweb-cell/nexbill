import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { deleteAcademic, updateAcademic } from "@/lib/activity-calendar/academic";
import { parseAcademicInput } from "@/lib/activity-calendar/academic-rules";
import { isMissingRelation } from "@/lib/activity-calendar/http";

const MIGRATION = "Jalankan migrasi 0040_activity_holidays_academic.sql di Supabase.";

async function guard() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) };
  if (!hasPermission(session.role as StaffRole, "manage_settings")) return { error: NextResponse.json({ error: "Hanya peran dengan izin Pengaturan yang bisa mengubah kalender akademik." }, { status: 403 }) };
  return { session };
}

/** PATCH — ubah kegiatan akademik milik outlet sesi. */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    const { id } = await ctx.params;
    const parsed = parseAcademicInput(await req.json().catch(() => null));
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const item = await updateAcademic(g.session.outletId, id, parsed.value);
    if (!item) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err: unknown) {
    if (isMissingRelation(err)) return NextResponse.json({ error: MIGRATION }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** DELETE — hapus kegiatan akademik milik outlet sesi. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const g = await guard();
    if (g.error) return g.error;
    const { id } = await ctx.params;
    const ok = await deleteAcademic(g.session.outletId, id);
    if (!ok) return NextResponse.json({ error: "Kegiatan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (isMissingRelation(err)) return NextResponse.json({ error: MIGRATION }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
