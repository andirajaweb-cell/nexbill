import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { signPasswordResetToken } from "@/lib/auth/password-reset";
import { sendEmail, forgotPasswordEmail } from "@/lib/notifications/email";
import { describeError } from "@/lib/api/error";

const GENERIC_OK = { ok: true, message: "Kalau email tersebut terdaftar, link reset password sudah dikirim." };

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email wajib diisi." }, { status: 400 });

    // Always return the same generic response whether or not the email exists / is active —
    // a distinct "email not found" error here would let anyone probe which emails have an
    // account on this system (account enumeration). The email itself is the only place that
    // reveals anything, and only to whoever actually controls that inbox.
    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.email, String(email).toLowerCase().trim())).limit(1);
    if (!user || !user.isActive) return NextResponse.json(GENERIC_OK);

    const token = signPasswordResetToken(user.id, user.passwordHash);
    const baseUrl = process.env.APP_BASE_URL || req.nextUrl.origin;
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const { subject, html } = forgotPasswordEmail(user.name, resetUrl);
    await sendEmail({ to: user.email, subject, html });

    return NextResponse.json(GENERIC_OK);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
