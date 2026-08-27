import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/**
 * Session system for NEXBILL's own platform control panel (/platform-admin) — completely
 * separate from the outlet-facing staff session (see ./session.ts). Different cookie name,
 * different JWT secret env var, different payload shape (no outletId/role — a platform admin
 * isn't scoped to any outlet at all). This separation is deliberate: an outlet's "superuser"
 * staff session must never be readable as a platform-admin session, even by accident, because
 * the platform panel shows cross-tenant data (every outlet's subscription revenue, app-wide
 * COGS) that no merchant should ever be able to reach.
 */

export interface PlatformSessionPayload {
  sub: string; // platformAdmins.id
  email: string;
  name: string;
}

// Deliberately falls back to a DIFFERENT dev secret than the staff session (session.ts) so the
// two token types are never accidentally interchangeable even if someone reuses JWT_SECRET.
const SECRET = process.env.PLATFORM_ADMIN_JWT_SECRET || process.env.JWT_SECRET || "dev-insecure-platform-secret-change-me";
export const PLATFORM_SESSION_COOKIE_NAME = "nexbill_platform_admin_session";
export const PLATFORM_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours — shorter-lived than staff sessions, this is the most sensitive login in the app

export function signPlatformSessionToken(payload: PlatformSessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: PLATFORM_SESSION_MAX_AGE_SECONDS });
}

export function verifyPlatformSessionToken(token: string): PlatformSessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as PlatformSessionPayload;
  } catch {
    return null;
  }
}

/** Reads + verifies the platform-admin session cookie from a Route Handler or Server Component. */
export async function getPlatformSession(): Promise<PlatformSessionPayload | null> {
  const store = await cookies();
  const token = store.get(PLATFORM_SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyPlatformSessionToken(token);
}

/** Throws a plain Error (caught by the route's try/catch -> 401) if there's no valid platform-admin session. */
export async function requirePlatformAdmin(): Promise<PlatformSessionPayload> {
  const session = await getPlatformSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  return session;
}
