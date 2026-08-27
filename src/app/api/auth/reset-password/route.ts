import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { verifyPasswordResetToken, fingerprintPasswordHash } from "@/lib/auth/password-reset";
import { describeError } from "@/lib/api/error";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: "Token dan password baru wajib diisi." }, { status: 400 });
    if (String(password).length < 8) return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });

    const payload = verifyPasswordResetToken(token);
    if (!payload) return NextResponse.json({ error: "Link reset password tidak valid atau sudah kedaluwarsa. Minta link baru." }, { status: 400 });

    const [user] = await db.select().from(staffUsers).where(eq(staffUsers.id, payload.sub)).limit(1);
    if (!user || !user.isActive) return NextResponse.json({ error: "Akun tidak ditemukan atau nonaktif." }, { status: 404 });

    // fingerprint mismatch = this exact link was already redeemed (passwordHash has since
    // changed), or a newer reset link was requested and used after this one was issued — see
    // password-reset.ts for the self-invalidation design.
    if (fingerprintPasswordHash(user.passwordHash) !== payload.fp) {
      return NextResponse.json({ error: "Link reset password ini sudah digunakan atau tidak berlaku lagi. Minta link baru." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(staffUsers).set({ passwordHash, updatedAt: new Date().toISOString() }).where(eq(staffUsers.id, user.id));

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
