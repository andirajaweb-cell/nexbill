import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Self-service "Akun Saya" tab on /dashboard/settings — a logged-in staffer changing their own
 * password (or, for a Google-only account with no passwordHash yet, setting one for the first
 * time so email/password becomes an additional way in, alongside "Masuk dengan Google").
 *
 * currentPassword is required whenever the account already has a passwordHash — skipping that
 * check would let anyone with a hijacked/left-open session lock out the real owner by silently
 * swapping the password. It's only skipped for the Google-only "no password yet" case, since
 * there's nothing to verify against.
 */
/** Lets the "Akun Saya" tab know upfront whether to ask for a current password (normal change)
 * or skip straight to "set a password" (Google-only account with no passwordHash yet) — without
 * exposing the hash itself or piggybacking this query onto the hot /api/auth/me route. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const [user] = await db.select({ passwordHash: staffUsers.passwordHash }).from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
    return NextResponse.json({ hasPassword: !!user?.passwordHash });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!newPassword) return NextResponse.json({ error: "Password baru wajib diisi." }, { status: 400 });
    if (String(newPassword).length < 8) return NextResponse.json({ error: "Password baru minimal 8 karakter." }, { status: 400 });

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
    if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

    if (user.passwordHash) {
      if (!currentPassword) return NextResponse.json({ error: "Password saat ini wajib diisi." }, { status: 400 });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return NextResponse.json({ error: "Password saat ini salah." }, { status: 401 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(staffUsers).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(staffUsers.id, user.id));

    return NextResponse.json({ ok: true, hadPasswordBefore: !!user.passwordHash });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
