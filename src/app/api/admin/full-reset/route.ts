import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { resetAllData } from "@/lib/admin/full-reset";
import { describeError } from "@/lib/api/error";

/**
 * Full factory data reset — irreversible through the app itself (recovery
 * relies on Supabase's own managed backups / point-in-time recovery, not a
 * file this app writes — see backupCheckpointNote() in full-reset.ts).
 * Locked down harder than every other admin action in this app on purpose:
 *  - session.role must literally be "superuser" or "owner" — the two full-authority
 *    roles, re-checked directly rather than via hasPermission() so no permission
 *    matrix edit can ever loosen this specific gate.
 *  - the caller must re-type their OWN login email (verified fresh against the DB
 *    row, not the possibly-stale JWT) AND re-enter their password, also verified
 *    fresh against the DB. Using the caller's own email as the confirm phrase (rather
 *    than a fixed literal string anyone could memorize/screenshot) ties the
 *    confirmation to the specific account performing the deletion.
 * On success, clears the session cookie so they have to log back in —
 * partly hygiene, partly a forcing function to prove the login still works
 * post-reset before they walk away thinking it's fine.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (session.role !== "superuser" && session.role !== "owner") {
      return NextResponse.json({ error: "Hanya akun Superuser/Owner yang bisa menghapus semua data." }, { status: 403 });
    }

    const { confirmPhrase, password } = await req.json();

    const [owner] = await db.select().from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
    if (!owner || !owner.isActive) return NextResponse.json({ error: "Akun tidak ditemukan/nonaktif." }, { status: 401 });

    if (String(confirmPhrase ?? "").trim().toLowerCase() !== owner.email.toLowerCase()) {
      return NextResponse.json({ error: `Ketik ulang persis: "${owner.email}"` }, { status: 400 });
    }
    if (!password) return NextResponse.json({ error: "Masukkan password kamu untuk konfirmasi." }, { status: 400 });

    // Google-only accounts (see lib/auth/google-pending.ts) have no passwordHash — there's no
    // password to confirm with, so this destructive action can't be re-authorized that way.
    if (!owner.passwordHash) {
      return NextResponse.json({ error: "Akun Google tidak punya password. Fitur ini butuh konfirmasi password." }, { status: 400 });
    }
    const passwordOk = await bcrypt.compare(password, owner.passwordHash);
    if (!passwordOk) return NextResponse.json({ error: "Password salah." }, { status: 401 });

    console.warn(`[FULL RESET] Dijalankan oleh superuser ${owner.email} (${owner.id}) untuk outlet ${session.outletId} pada ${new Date().toISOString()}`);
    const { backupPath, tablesCleared } = await resetAllData(session.outletId);

    const res = NextResponse.json({ ok: true, backupPath, tablesCleared: tablesCleared.length });
    // Force re-login — proves the superuser account (the only thing guaranteed to survive) still works.
    res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
