import { NextResponse } from "next/server";
import { getPushPublicKey } from "@/lib/push/service";

/** Kunci publik VAPID untuk pushManager.subscribe() di browser. Tidak rahasia. */
export async function GET() {
  const publicKey = getPushPublicKey();
  return NextResponse.json({ configured: !!publicKey, publicKey });
}
