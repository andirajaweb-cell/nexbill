import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseServerClient } from "@/lib/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { signGooglePendingToken, GOOGLE_PENDING_COOKIE, GOOGLE_PENDING_MAX_AGE_SECONDS } from "@/lib/auth/google-pending";
import { describeError } from "@/lib/api/error";

/**
 * Landing point after Google redirects back through Supabase Auth's own hosted OAuth callback
 * (Supabase is the registered OAuth client with Google — see the Google Cloud Console + Supabase
 * dashboard setup notes; nothing about Google's client id/secret lives in this app's own env).
 * `supabase.auth.signInWithOAuth()` on /login and /daftar points its `redirectTo` at this route.
 *
 * Exchanges the PKCE `code` for a Supabase Auth session, reads the now-verified identity off it,
 * then bridges into this app's OWN session system (see lib/auth/session.ts) — Supabase Auth is
 * used ONLY as the OAuth handshake here. The app's real session stays the existing pos_session
 * JWT cookie, so every existing permission/outlet-scoping check across ~30 call sites keeps
 * working completely unchanged, whether someone logged in with a password or with Google.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const loginUrl = new URL("/login", url.origin);

  if (!code) {
    loginUrl.searchParams.set("error", "google_no_code");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) throw exchangeError;

    // getUser() re-validates against Supabase Auth's server rather than trusting the local
    // session payload directly — this IS the "verified" identity everything downstream relies on.
    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user?.email) throw userError || new Error("Google tidak mengembalikan alamat email.");

    const email = data.user.email.toLowerCase().trim();
    const name = (data.user.user_metadata?.full_name as string) || (data.user.user_metadata?.name as string) || email.split("@")[0];
    const googleId = data.user.id;

    // Done with the Supabase Auth session itself — nothing else in this app reads it, the bridge
    // to our own session happens below.
    await supabase.auth.signOut();

    const [existing] = await db.select().from(staffUsers).where(eq(staffUsers.email, email)).limit(1);

    if (existing) {
      if (!existing.isActive) {
        loginUrl.searchParams.set("error", "google_inactive");
        return NextResponse.redirect(loginUrl);
      }
      // Auto-link by verified email on first Google sign-in for a pre-existing account —
      // authProvider is deliberately left untouched so a password account keeps working with
      // BOTH methods afterward, it isn't converted to Google-only.
      if (!existing.googleId) {
        await db.update(staffUsers).set({ googleId }).where(eq(staffUsers.id, existing.id));
      }
      const token = signSessionToken({ sub: existing.id, outletId: existing.outletId, role: existing.role, name: existing.name, email: existing.email });
      const res = NextResponse.redirect(new URL(next, url.origin));
      res.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE_SECONDS });
      return res;
    }

    // No matching account — hand off the VERIFIED identity to /daftar via a short-lived signed
    // cookie (see lib/auth/google-pending.ts), never via a client-editable query param.
    const pendingToken = signGooglePendingToken({ email, name, googleId });
    const res = NextResponse.redirect(new URL("/daftar?google=1", url.origin));
    res.cookies.set(GOOGLE_PENDING_COOKIE, pendingToken, { httpOnly: true, sameSite: "lax", path: "/", maxAge: GOOGLE_PENDING_MAX_AGE_SECONDS });
    return res;
  } catch (err: unknown) {
    console.error("Google OAuth callback failed:", describeError(err));
    loginUrl.searchParams.set("error", "google_failed");
    return NextResponse.redirect(loginUrl);
  }
}
