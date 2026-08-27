import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signPlatformSessionToken, PLATFORM_SESSION_COOKIE_NAME, PLATFORM_SESSION_MAX_AGE_SECONDS } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

/**
 * Login for the platform control panel — completely separate from /api/auth/login (outlet
 * staff). Checks the platformAdmins table only; a valid outlet staff email/password combo has
 * no row here and will always 401, by construction (no shared table, no shared cookie).
 */
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email dan password wajib diisi." }, { status: 400 });

    const [admin] = await db.select().from(platformAdmins).where(eq(platformAdmins.email, String(email).toLowerCase().trim())).limit(1);
    if (!admin) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });
    if (!admin.isActive) return NextResponse.json({ error: "Akun ini nonaktif." }, { status: 403 });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return NextResponse.json({ error: "Email atau password salah." }, { status: 401 });

    const token = signPlatformSessionToken({ sub: admin.id, email: admin.email, name: admin.name });
    const res = NextResponse.json({ id: admin.id, name: admin.name, email: admin.email });
    res.cookies.set(PLATFORM_SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: PLATFORM_SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
