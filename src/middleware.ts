import { NextRequest, NextResponse } from "next/server";

/**
 * Two-domain split: the marketing/landing site (nexbill.id, www.nexbill.id) and the app itself
 * — login, signup, password reset, /dashboard, /platform-admin — live on dashboard.nexbill.id.
 * This is still ONE Next.js app/deployment; the split is purely host-based routing here, not
 * separate codebases.
 *
 * Why login/daftar had to move too (not just /dashboard): the session cookie set by
 * /api/auth/login (see lib/auth/session.ts) is host-only — a cookie set while serving
 * nexbill.id is never sent back on requests to dashboard.nexbill.id, even though they share a
 * parent domain. So the page that SETS the cookie and the pages that READ it must be on the
 * exact same host, or login silently "succeeds" but /dashboard still sees no session.
 *
 * Local dev (localhost) and Vercel preview deployments (*.vercel.app) are deliberately left
 * alone below — `isKnownHost` only matches the two real production hostnames, so
 * `npm run dev` and preview URLs keep serving every route from one host exactly as before.
 */
const SESSION_COOKIE_NAME = "pos_session";
const LANDING_HOSTS = new Set(["nexbill.id", "www.nexbill.id"]);
const DASHBOARD_HOST = "dashboard.nexbill.id";

// Prefixes that only make sense on the dashboard host. Redirected here (rather than left to
// 404) so old links/bookmarks to nexbill.id/login etc. from before the split still work.
const APP_PATH_PREFIXES = ["/dashboard", "/platform-admin", "/login", "/daftar", "/reset-password", "/lupa-password"];

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = req.nextUrl;
  const isKnownHost = LANDING_HOSTS.has(host) || host === DASHBOARD_HOST;

  if (isKnownHost) {
    const isAppPath = APP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

    if (LANDING_HOSTS.has(host) && isAppPath) {
      // 308 (Permanent Redirect) rather than the NextResponse.redirect() default of 307: this
      // host split is a permanent structural fact of the deployment (not a temporary maintenance
      // redirect), so search engines should transfer ranking signal to the dashboard-host URL and
      // browsers/CDNs are allowed to cache the redirect. 308 is the modern, method-preserving
      // equivalent of a classic 301 — 301 technically permits clients to rewrite POST to GET,
      // which 308 does not, so 308 is the correct choice for a middleware-level route redirect.
      return NextResponse.redirect(new URL(`https://${DASHBOARD_HOST}${pathname}${search}`), 308);
    }
    // The marketing homepage/legal pages have no business rendering on the app's own host —
    // send visitors straight to the login gate instead of the landing page. Also permanent.
    if (host === DASHBOARD_HOST && pathname === "/") {
      return NextResponse.redirect(new URL("/login", req.url), 308);
    }
  }

  // Unchanged from before the domain split: redirect to /login if there's no session cookie at
  // all. Real signature verification still happens in getSession()/requireRole() (session.ts).
  // Kept as a 307 (temporary) — unlike the host-split redirects above, this one is conditional on
  // auth state, not a permanent fact about the URL, so caches must not memorize it.
  if (pathname.startsWith("/dashboard")) {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl, 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Broadened from just "/dashboard/:path*" so the host-based redirects above can run on every
  // page route (login, daftar, the marketing homepage, etc.) — API routes and static assets are
  // excluded since they don't need this, and client-side fetch() calls already resolve against
  // whatever host actually served the page, so they never need a cross-domain redirect.
  matcher: ["/((?!api/|_next/|.*\\..*).*)"],
};
