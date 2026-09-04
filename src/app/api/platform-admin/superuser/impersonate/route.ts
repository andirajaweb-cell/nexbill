import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * The ONLY way to reach a "superuser" (staff_users.role = "superuser") dashboard session — see
 * /api/auth/login and /api/auth/google/callback, which both now explicitly refuse to log a
 * superuser row in directly. That's a deliberate access-control decision: superuser is a
 * NEXBILL-internal role (full, unrestricted /dashboard access, bypassing every isSuperRole()
 * gate across the app — see lib/auth/client.tsx), and it must never be reachable by anyone who
 * only knows an email/password or has a Google account, even if they somehow guessed/obtained
 * the right credentials. Minting a superuser session is only possible from inside an already-
 * authenticated platform-admin session (requirePlatformAdmin() below), which is NEXBILL's own
 * separate, internal-only login system (see platform-session.ts) — so this route is a one-way
 * elevation bridge: platform-admin (the trusted root) can mint a lesser staff session, but a
 * staff session can never be used to reach platform-admin.
 */
export async function POST() {
  try {
    await requirePlatformAdmin();

    const [superuser] = await db
      .select()
      .from(staffUsers)
      .where(and(eq(staffUsers.role, "superuser"), eq(staffUsers.isActive, true)))
      .orderBy(asc(staffUsers.createdAt))
      .limit(1);

    if (!superuser) {
      return NextResponse.json(
        { error: "Belum ada akun superuser aktif di staff_users. Buat dulu lewat onboarding + ubah kolom role jadi \"superuser\" di Table Editor." },
        { status: 404 }
      );
    }

    const token = signSessionToken({
      sub: superuser.id,
      outletId: superuser.outletId,
      role: superuser.role,
      name: superuser.name,
      email: superuser.email,
    });
    const res = NextResponse.json({ id: superuser.id, name: superuser.name, email: superuser.email });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login sebagai platform admin." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
