import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers, outlets } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth/session";
import { canManageOutlet } from "@/lib/outlets/membership";
import { deleteOutletPermanently } from "@/lib/admin/delete-outlet";
import { describeError } from "@/lib/api/error";

/**
 * Permanent, irrecoverable-through-the-app outlet deletion — see deleteOutletPermanently() in
 * lib/admin/delete-outlet.ts for what actually gets removed. Locked down even harder than
 * archive (PATCH isActive:false) or full data reset:
 *  - Superuser only (not Owner) — this removes accounts too, not just business data.
 *  - Caller must be linked to this outlet (canManageOutlet) — no cross-tenant access by guessing an id.
 *  - Can't delete the outlet the caller is CURRENTLY switched into — avoids deleting your own
 *    active session's outlet out from under yourself mid-request; switch to a surviving outlet first.
 *  - Must re-type the outlet's exact name AND re-enter password, verified fresh against the DB.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya akun Superuser yang bisa menghapus outlet secara permanen." }, { status: 403 });
    }
    if (session.outletId === id) {
      return NextResponse.json({ error: "Tidak bisa menghapus outlet yang sedang kamu pakai sekarang. Pindah (switch) ke outlet lain dulu, baru hapus outlet ini." }, { status: 400 });
    }

    const allowed = await canManageOutlet(session.sub, id);
    if (!allowed) return NextResponse.json({ error: "Outlet tidak ditemukan atau tidak terhubung ke akun kamu." }, { status: 404 });

    const [target] = await db.select().from(outlets).where(eq(outlets.id, id)).limit(1);
    if (!target) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });

    const { confirmName, password } = await req.json();
    if (!confirmName || String(confirmName).trim() !== target.name) {
      return NextResponse.json({ error: `Ketik ulang persis nama outlet: "${target.name}"` }, { status: 400 });
    }
    if (!password) return NextResponse.json({ error: "Masukkan password kamu untuk konfirmasi." }, { status: 400 });

    const [me] = await db.select().from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
    if (!me || !me.isActive) return NextResponse.json({ error: "Akun tidak ditemukan/nonaktif." }, { status: 401 });
    // Google-only accounts (see lib/auth/google-pending.ts) have no passwordHash — there's no
    // password to confirm with, so this destructive action can't be re-authorized that way.
    if (!me.passwordHash) {
      return NextResponse.json({ error: "Akun Google tidak punya password. Fitur ini butuh konfirmasi password." }, { status: 400 });
    }
    const passwordOk = await bcrypt.compare(password, me.passwordHash);
    if (!passwordOk) return NextResponse.json({ error: "Password salah." }, { status: 401 });

    console.warn(`[DELETE OUTLET] Dijalankan oleh superuser ${me.email} (${me.id}) untuk outlet ${id} ("${target.name}") pada ${new Date().toISOString()}`);
    const result = await deleteOutletPermanently(id);

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
