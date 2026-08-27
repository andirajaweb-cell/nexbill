import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.email, String(email).toLowerCase().trim())).limit(1);
    if (!user) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    if (!user.isActive) return NextResponse.json({ error: "Akun ini nonaktif — hubungi superuser." }, { status: 403 });
    // Google-only accounts (see lib/auth/google-pending.ts) have no passwordHash at all —
    // bcrypt.compare() would throw on null, so guard it with a message pointing at the real path.
    if (!user.passwordHash) {
      return NextResponse.json({ error: "Akun ini terdaftar via Google — gunakan tombol \"Masuk dengan Google\" di bawah." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });

    const token = signSessionToken({ sub: user.id, outletId: user.outletId, role: user.role, name: user.name, email: user.email });
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
