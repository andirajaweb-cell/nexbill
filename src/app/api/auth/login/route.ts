import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSessionToken, readSessionCookie, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { claimSession, SessionConflictError } from "@/lib/auth/single-session";
import { describeError } from "@/lib/api/error";
import { isDemoEmail, visitorKey, DEMO_LOGIN_ACTION } from "@/lib/auth/demo-account";
import { describeDevice } from "@/lib/auth/single-session";
import { logAudit } from "@/lib/audit/log";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.email, String(email).toLowerCase().trim())).limit(1);
    if (!user) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    if (!user.isActive) return NextResponse.json({ error: "Akun ini nonaktif — hubungi superuser." }, { status: 403 });
    // "superuser" is NEXBILL-internal only and deliberately unreachable from this public login
    // form, no matter how correct the password is — see /api/platform-admin/superuser/impersonate
    // for the only supported way to open a superuser session (from inside platform-admin).
    if (user.role === "superuser") {
      return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    }
    // Google-only accounts (see lib/auth/google-pending.ts) have no passwordHash at all —
    // bcrypt.compare() would throw on null, so guard it with a message pointing at the real path.
    if (!user.passwordHash) {
      return NextResponse.json({ error: "Akun ini terdaftar via Google — gunakan tombol \"Masuk dengan Google\" di bawah." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });

    // Satu akun = satu perangkat aktif (lib/auth/single-session.ts). Login ulang di browser yang
    // sama boleh; browser/PC lain ditolak selama sesi yang ada masih aktif.
    let sid: string;
    try {
      const current = await readSessionCookie();
      sid = await claimSession(user, {
        userAgent: req.headers.get("user-agent"),
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        currentSid: current?.sub === user.id ? current.sid ?? null : null,
      });
    } catch (err) {
      if (err instanceof SessionConflictError) return NextResponse.json({ error: err.message, code: "SESSION_ACTIVE_ELSEWHERE" }, { status: 409 });
      throw err;
    }

    // Statistik akun demo publik (Platform Admin → Akun Demo). IP tidak disimpan mentah — hanya hash
    // pendek IP+perangkat untuk menghitung pengunjung unik.
    if (isDemoEmail(user.email)) {
      const ua = req.headers.get("user-agent");
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      await logAudit({
        outletId: user.outletId,
        staffUserId: user.id,
        action: DEMO_LOGIN_ACTION,
        entityType: "staff_user",
        entityId: user.id,
        after: { visitor: await visitorKey(ip, ua), device: describeDevice(ua), country: req.headers.get("x-vercel-ip-country") ?? null, source: req.headers.get("referer") ?? null },
      });
    }

    const token = signSessionToken({ sub: user.id, outletId: user.outletId, role: user.role, name: user.name, email: user.email, sid });
    const res = NextResponse.json({ id: user.id, name: user.name, email: user.email, role: user.role, outletId: user.outletId });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
