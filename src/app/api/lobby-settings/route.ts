import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { outlets } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { hasPermission, isFullAuthorityRole, type StaffRole } from "@/lib/auth/permissions";
import { ensureOutletSlug } from "@/lib/outlets/slug";
import { cleanAnnouncement } from "@/lib/lobby/board";
import { getLobbySettings, saveLobbySettings } from "@/lib/lobby/server";

/**
 * Pengaturan papan lobi publik untuk outlet sesi login. GET: semua staf (link-nya memang publik).
 * PUT { enabled, announcement }: Owner atau pemegang izin Kelola Pengaturan. Outlet SELALU dari sesi.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const outletId = session.outletId;
    const [row] = await db.select({ slug: outlets.slug }).from(outlets).where(eq(outlets.id, outletId)).limit(1);
    const slug = row?.slug ?? (await ensureOutletSlug(outletId));
    const settings = await getLobbySettings(outletId);
    const canEdit = isFullAuthorityRole(session.role as StaffRole) || hasPermission(session.role as StaffRole, "manage_settings");
    return NextResponse.json({ slug, ...settings, canEdit });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!isFullAuthorityRole(session.role as StaffRole) && !hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah papan lobi." }, { status: 403 });
    }
    const outletId = session.outletId;
    const body = await req.json().catch(() => ({}));
    await saveLobbySettings(outletId, { enabled: body?.enabled !== false, announcement: cleanAnnouncement(body?.announcement) }, session.sub);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
