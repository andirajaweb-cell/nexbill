import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { signEmailVerificationToken } from "@/lib/auth/email-verification";
import { sendEmail, verifyEmailEmail } from "@/lib/notifications/email";
import { describeError } from "@/lib/api/error";

/**
 * Self-service resend for the account currently logged in — session-gated rather than an
 * email-address-input form (like /api/auth/forgot-password), since being logged in as the
 * account already proves who's asking, so there's no account-enumeration concern to design
 * around here.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, session.sub)).limit(1);
    if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const token = signEmailVerificationToken(user.id, user.email);
    const baseUrl = process.env.APP_BASE_URL || "https://dashboard.nexbill.id";
    const verifyUrl = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const { subject, html } = verifyEmailEmail(user.name, verifyUrl);
    const result = await sendEmail({ to: user.email, subject, html });

    return NextResponse.json({ ok: true, sent: result.sent });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
