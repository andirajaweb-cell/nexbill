import { NextResponse } from "next/server";
import { PLATFORM_SESSION_COOKIE_NAME } from "@/lib/auth/platform-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(PLATFORM_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  return res;
}
