import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { deleteOutletPermanently } from "@/lib/admin/delete-outlet";
import { describeError } from "@/lib/api/error";

/**
 * Platform-admin counterpart to POST /api/outlets/[id]/delete-permanent (the outlet-side
 * self-service version) — same underlying deleteOutletPermanently() from lib/admin/delete-outlet.ts,
 * so it wipes literally every row scoped to the outlet in one transaction, no exceptions. Reachable
 * from /platform-admin without needing to log in as that outlet's own Superuser.
 *
 * Guarded the same way the outlet-side version is, plus one extra step:
 *  - Outlet must already be ARCHIVED (isActive=false) — mirrors dashboard/semua-outlet's own rule
 *    (nonaktifkan dulu, baru bisa dihapus tuntas), so a platform admin can't nuke a live, actively
 *    used outlet in one click; archiving first is a real pause to reconsider.
 *  - Must re-type the outlet's exact name.
 *  - Must re-enter the CALLING platform admin's own password, verified fresh against the DB.
 * There is no "can't delete the outlet I'm currently in" check here (unlike the outlet-side
 * version) since a platform admin session isn't scoped to any outlet at all.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requirePlatformAdmin();

    const [target] = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
    if (!target) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    if (target.isActive) {
      return NextResponse.json(
        { error: "Nonaktifkan (arsipkan) outlet ini dulu sebelum bisa dihapus permanen — langkah jeda supaya tidak ada outlet aktif terhapus tidak sengaja." },
        { status: 400 }
      );
    }

    const { confirmName, password } = await req.json();
    if (!confirmName || String(confirmName).trim() !== target.name) {
      return NextResponse.json({ error: `Ketik ulang persis nama outlet: "${target.name}"` }, { status: 400 });
    }
    if (!password) return NextResponse.json({ error: "Masukkan password akun platform-admin kamu untuk konfirmasi." }, { status: 400 });

    const [me] = await db.select().from(platformAdmins).where(eq(platformAdmins.id, session.sub)).limit(1);
    if (!me || !me.isActive) return NextResponse.json({ error: "Akun platform-admin tidak ditemukan/nonaktif." }, { status: 401 });
    const passwordOk = await bcrypt.compare(password, me.passwordHash);
    if (!passwordOk) return NextResponse.json({ error: "Password salah." }, { status: 401 });

    console.warn(`[DELETE OUTLET / PLATFORM-ADMIN] Dijalankan oleh ${me.email} (${me.id}) untuk outlet ${id} ("${target.name}") pada ${new Date().toISOString()}`);
    const result = await deleteOutletPermanently(id);

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
