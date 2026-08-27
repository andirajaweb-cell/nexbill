import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/**
 * Short-lived bridge between the Google OAuth callback (/api/auth/google/callback) and the
 * signup wizard (/daftar) for a brand-new visitor with no existing staffUsers row yet.
 *
 * The callback route has already verified this identity against Supabase Auth (which in turn
 * verified it against Google) — /daftar must NEVER trust a client-supplied email/name for a
 * Google signup, only what's inside this signed httpOnly cookie. Otherwise anyone could submit
 * the registration form claiming an arbitrary email address as "verified via Google".
 *
 * Deliberately short-lived (15 minutes) since it only needs to survive one pass through the
 * /daftar wizard, not act as a real session.
 */

export interface GooglePendingPayload {
  email: string;
  name: string;
  googleId: string; // Supabase Auth user id for the verified Google identity
}

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me-in-.env";
export const GOOGLE_PENDING_COOKIE = "google_pending";
export const GOOGLE_PENDING_MAX_AGE_SECONDS = 60 * 15;

export function signGooglePendingToken(payload: GooglePendingPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: GOOGLE_PENDING_MAX_AGE_SECONDS });
}

export function verifyGooglePendingToken(token: string): GooglePendingPayload | null {
  try {
    return jwt.verify(token, SECRET) as GooglePendingPayload;
  } catch {
    return null;
  }
}

/** Reads + verifies the google_pending cookie from within a Route Handler or Server Component. */
export async function getGooglePending(): Promise<GooglePendingPayload | null> {
  const store = await cookies();
  const token = store.get(GOOGLE_PENDING_COOKIE)?.value;
  if (!token) return null;
  return verifyGooglePendingToken(token);
}
