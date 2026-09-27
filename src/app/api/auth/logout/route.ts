import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, readSessionCookie } from "@/lib/auth/session";
import { releaseSession } from "@/lib/auth/single-session";

export async function POST() {
  // Bebaskan akun supaya bisa langsung login di perangkat lain (hanya bila sesi ini yang berlaku).
  const current = await readSessionCookie();
  if (current) await releaseSession(current.sub, current.sid).catch(() => undefined);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
