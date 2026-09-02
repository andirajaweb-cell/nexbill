import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyEmailVerificationToken } from "@/lib/auth/email-verification";
import { describeError } from "@/lib/api/error";

/** Redeems an email-verification link's token (see /verify-email page + lib/auth/email-verification.ts). No login required — the token IS the proof. */
export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return NextResponse.json({ error: "Token tidak ditemukan." }, { status: 400 });

    const decoded = verifyEmailVerificationToken(token);
    if (!decoded) return NextResponse.json({ error: "Link verifikasi tidak valid atau sudah kedaluwarsa (berlaku 3 hari)." }, { status: 400 });

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, decoded.sub)).limit(1);
    if (!user) return NextResponse.json({ error: "Akun tidak ditemukan." }, { status: 404 });
    if (user.email.toLowerCase() !== decoded.email) {
      return NextResponse.json({ error: "Link ini untuk alamat email yang berbeda dari yang terdaftar sekarang. Minta link verifikasi baru." }, { status: 400 });
    }

    if (!user.emailVerified) {
      await db.update(staffUsers).set({ emailVerified: true, emailVerifiedAt: new Date().toISOString() }).where(eq(staffUsers.id, user.id));
    }

    return NextResponse.json({ ok: true, email: user.email });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
