import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Forgot-password reset tokens — deliberately stateless (a signed JWT, like session.ts and
 * google-pending.ts), so no new DB table/migration was needed for this feature.
 *
 * Self-invalidation trick: the token carries a short "fingerprint" of the user's passwordHash
 * AT THE MOMENT THE LINK WAS ISSUED. When the token is redeemed, /api/auth/reset-password
 * re-fingerprints the user's CURRENT passwordHash and compares. Since resetting the password
 * always changes passwordHash, redeeming a token once makes every other outstanding token for
 * that account (e.g. from clicking "lupa password" twice, or an old email being replayed)
 * invalid automatically — no need to track "used" tokens in a database.
 *
 * A Google-only account (passwordHash === null, see google-pending.ts) fingerprints to a fixed
 * "no-password" sentinel — so a first-time "set a password" reset still self-invalidates after
 * use (the fingerprint changes from the sentinel to a real hash on redemption).
 */

export interface PasswordResetPayload {
  sub: string; // staffUserId
  purpose: "password_reset";
  fp: string; // passwordHash fingerprint at issue time
}

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me-in-.env";
export const PASSWORD_RESET_MAX_AGE_SECONDS = 60 * 30; // 30 minutes — long enough to find the email, short enough to limit a leaked-link window

export function fingerprintPasswordHash(passwordHash: string | null): string {
  return crypto
    .createHash("sha256")
    .update(passwordHash ?? "no-password")
    .digest("hex")
    .slice(0, 16);
}

export function signPasswordResetToken(staffUserId: string, currentPasswordHash: string | null): string {
  const payload: PasswordResetPayload = { sub: staffUserId, purpose: "password_reset", fp: fingerprintPasswordHash(currentPasswordHash) };
  return jwt.sign(payload, SECRET, { expiresIn: PASSWORD_RESET_MAX_AGE_SECONDS });
}

export function verifyPasswordResetToken(token: string): PasswordResetPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as PasswordResetPayload;
    if (decoded.purpose !== "password_reset") return null; // reject a session/google-pending token shape being replayed here
    return decoded;
  } catch {
    return null;
  }
}
