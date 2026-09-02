import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession, signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Self-service "Akun Saya" tab on /dashboard/settings — lets a logged-in staffer edit their own
 * display name. Deliberately not gated behind manage_settings/manage_staff (same rationale as
 * change-password): this only touches the caller's own row, not outlet config or other staff.
 *
 * Re-signs the session cookie with the new name afterward — the session JWT caches name/email
 * at login time (see signSessionToken in login/route.ts), so without this the sidebar/topbar
 * would keep showing the old name until the next login.
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const { name } = await req.json();
    const trimmed = String(name ?? "").trim();
    if (!trimmed) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    if (trimmed.length > 120) return NextResponse.json({ error: "Nama maksimal 120 karakter." }, { status: 400 });

    await db.update(staffUsers).set({ name: trimmed, updatedAt: new Date().toISOString() }).where(eq(staffUsers.id, session.sub));

    const token = signSessionToken({ ...session, name: trimmed });
    const res = NextResponse.json({ ok: true, name: trimmed });
    res.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });
    return res;
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
