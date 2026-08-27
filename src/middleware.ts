import { NextRequest, NextResponse } from "next/server";

/**
 * Gate for /dashboard/** pages: redirect to /login if there's no session
 * cookie at all. This runs on the Edge runtime, so it only checks presence
 * (jsonwebtoken needs Node crypto, not available here) — real signature
 * verification happens in getSession()/requireRole() (src/lib/auth/session.ts)
 * on every page load and on the specific API routes that enforce roles.
 * Keep this cookie name in sync with SESSION_COOKIE_NAME in that file.
 */
const SESSION_COOKIE_NAME = "pos_session";

export function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
