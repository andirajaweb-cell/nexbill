import jwt from "jsonwebtoken";

/**
 * Email verification links — deliberately stateless (a signed JWT, same pattern as
 * password-reset.ts and google-pending.ts), so no separate token table/migration was needed.
 *
 * Unlike a password-reset token, this one does NOT need a self-invalidating fingerprint —
 * redeeming it twice (or someone re-clicking an old email) is harmless, since the action it
 * performs (mark emailVerified=true) is idempotent. The `email` field IS still carried in the
 * payload and re-checked at redemption time against the account's CURRENT email, so that if an
 * account's email is ever changed in the future, an old link for the PREVIOUS address can never
 * mark the new one verified without actually proving ownership of it.
 */

export interface EmailVerificationPayload {
  sub: string; // staffUserId
  purpose: "email_verification";
  email: string; // the email being verified at issue time
}

const SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me-in-.env";
export const EMAIL_VERIFICATION_MAX_AGE_SECONDS = 60 * 60 * 24 * 3; // 3 days — generous, this isn't a sensitive action

export function signEmailVerificationToken(staffUserId: string, email: string): string {
  const payload: EmailVerificationPayload = { sub: staffUserId, purpose: "email_verification", email: email.toLowerCase().trim() };
  return jwt.sign(payload, SECRET, { expiresIn: EMAIL_VERIFICATION_MAX_AGE_SECONDS });
}

export function verifyEmailVerificationToken(token: string): EmailVerificationPayload | null {
  try {
    const decoded = jwt.verify(token, SECRET) as EmailVerificationPayload;
    if (decoded.purpose !== "email_verification") return null; // reject a session/reset/google-pending token shape being replayed here
    return decoded;
  } catch {
    return null;
  }
}
