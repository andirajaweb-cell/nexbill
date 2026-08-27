import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/auth/platform-session";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  return NextResponse.json(session);
}
