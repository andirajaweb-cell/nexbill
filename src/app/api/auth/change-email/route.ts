import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq, ne, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getSession, signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Self-service "Akun Saya" tab on /dashboard/settings — lets a logged-in staffer change the
 * email they log in with. Requires the current password as confirmation whenever the account
 * has one (same rationale as change-password: a hijacked/left-open session shouldn't be able to
 * silently redirect the account's login email to an attacker-controlled address). Google-only
 * accounts (no passwordHash yet) skip that check since there's nothing to verify against.
 *
 * email is globally unique across staff_users (see login/route.ts, which looks it up with no
 * outlet filter), so the uniqueness check here must also be table-wide, not scoped to the
 * caller's own outlet.
 *
 * Re-signs the session cookie with the new email afterward, same reason as profile/route.ts.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const { newEmail, currentPassword } = await req.json();
    const normalized = String(newEmail ?? "").toLowerCase().trim();
    if (!normalized || !normalized.includes("@")) return NextResponse.json({ error: "Email baru tidak valid." }, { status: 400 });

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
    if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });

    if (user.passwordHash) {
      if (!currentPassword) return NextResponse.json({ error: "Password saat ini wajib diisi." }, { status: 400 });
      const ok = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!ok) return NextResponse.json({ error: "Password saat ini salah." }, { status: 401 });
    }

    if (normalized === user.email.toLowerCase()) {
      return NextResponse.json({ error: "Email baru sama dengan email saat ini." }, { status: 400 });
    }

    const [taken] = await db.select({ id: staffUsers.id }).from(staffUsers).where(and(eq(staffUsers.email, normalized), ne(staffUsers.id, user.id))).limit(1);
    if (taken) return NextResponse.json({ error: "Email sudah dipakai akun lain." }, { status: 400 });

    await db.update(staffUsers).set({ email: normalized, updatedAt: new Date().toISOString() }).where(eq(staffUsers.id, user.id));

    const token = signSessionToken({ ...session, email: normalized });
    const res = NextResponse.json({ ok: true, email: normalized });
    res.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });
    return res;
  } catch (err: unknown) {
    const real = describeError(err);
    const message = real.includes("UNIQUE") ? "Email sudah dipakai akun lain." : real;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
