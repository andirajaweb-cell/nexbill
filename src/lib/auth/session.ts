import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { refreshPermissionsCache } from "./permissions-store";
import { isSessionCurrent } from "./single-session";

/**
 * Real login/session system. Stateless JWT in an httpOnly cookie — no session
 * table needed, so adding this required zero schema/db:push changes (email +
 * passwordHash already existed on staffUsers from day one, just unused until
 * now). SECRET falls back to a dev value if JWT_SECRET isn't set in .env —
 * fine for local use, but set a real JWT_SECRET before deploying anywhere
 * shared.
 */

export interface SessionPayload {
  sub: string; // staffUserId
  outletId: string;
  role: string;
  name: string;
  email: string;
  /** Id sesi perangkat ini (lib/auth/single-session.ts). Kosong pada token lama & sesi superuser. */
  sid?: string;
}

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me-in-.env";
export const SESSION_COOKIE_NAME = "pos_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export function signSessionToken(payload: SessionPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Reads + verifies the session cookie from within a Route Handler or Server
 * Component. Also refreshes the in-memory role-permissions cache (see
 * permissions.ts / permissions-store.ts) on every call that finds a valid
 * session, so any hasPermission() check made later in the same request —
 * whether in an API route or directly in a server component's render —
 * always sees up-to-date permissions without every one of those ~30 call
 * sites needing to become async or await anything itself.
 */
/** Token cookie yang valid secara kriptografi, TANPA cek sesi-aktif — untuk login ulang/logout di browser yang sama. */
export async function readSessionCookie(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return token ? verifySessionToken(token) : null;
}

/** Sama dengan getSession(), tapi membedakan "belum login" dari "sesi sudah diganti/dikeluarkan". */
export async function inspectSession(): Promise<{ session: SessionPayload | null; ended: boolean }> {
  const raw = await readSessionCookie();
  if (!raw) return { session: null, ended: false };
  if (!(await isSessionCurrent(raw))) return { session: null, ended: true };
  return { session: raw, ended: false };
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const verified = verifySessionToken(token);
  // Satu perangkat aktif per akun: token yang sid-nya sudah bukan sesi berlaku (akun login di
  // perangkat lain setelah sesi ini habis, logout, atau dikeluarkan Owner) ditolak di sini — satu
  // tempat yang dilewati setiap route.
  const session = verified && (await isSessionCurrent(verified)) ? verified : null;
  if (session) {
    // NOTE: "owner" was briefly merged into "superuser" earlier in this project's history, then
    // split back out as its own real role (see StaffRole in permissions.ts) — do NOT reintroduce
    // an "owner" -> "superuser" auto-rewrite here, that would silently break every staffer who
    // now legitimately holds the "owner" role.
    await refreshPermissionsCache();
  }
  return session;
}

/** Throws a plain Error (caught by the route's try/catch -> 401/403) if there's no valid session, or the role isn't in `roles`. */
export async function requireRole(roles: string[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHENTICATED");
  if (!roles.includes(session.role)) throw new Error("FORBIDDEN");
  return session;
}
