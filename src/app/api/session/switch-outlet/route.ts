import { NextRequest, NextResponse } from "next/server";
import { getSession, signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { canAccessOutlet } from "@/lib/outlets/membership";
import { describeError } from "@/lib/api/error";

/**
 * Switches the session's ACTIVE outlet for accounts linked to more than one outlet (see
 * outletMemberships in schema.ts / lib/outlets/membership.ts) — every dashboard route reads
 * session.outletId to scope its data, so switching means re-signing the JWT with a new
 * outletId, not just flipping something client-side.
 *
 * SECURITY: the target outletId is re-validated against outletMemberships server-side on
 * every call, never trusted from the request body alone. This project already shipped and
 * then had to rip out one real vulnerability from skipping exactly this check (a
 * client-writable "selected outlet" cookie nobody validated against real ownership) — see
 * the header comment on the old /api/outlets/select route (now removed) and
 * /api/outlets/default. Do not weaken this check.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetOutletId = body?.outletId as string | undefined;
    if (!targetOutletId) return NextResponse.json({ error: "outletId wajib diisi." }, { status: 400 });

    const allowed = await canAccessOutlet(session.sub, targetOutletId);
    if (!allowed) {
      return NextResponse.json({ error: "Akun ini tidak terhubung ke outlet tersebut." }, { status: 403 });
    }

    const token = signSessionToken({
      sub: session.sub,
      outletId: targetOutletId,
      role: session.role,
      name: session.name,
      email: session.email,
    });
    const res = NextResponse.json({ outletId: targetOutletId });
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
