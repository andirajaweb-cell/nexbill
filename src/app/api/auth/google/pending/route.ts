import { NextResponse } from "next/server";
import { getGooglePending } from "@/lib/auth/google-pending";

/**
 * Read-only lookup the /daftar wizard calls on mount (when it sees ?google=1) to prefill the
 * owner name/email and switch into "verified via Google" mode — see lib/auth/google-pending.ts
 * for why this can't just be passed as URL query params instead.
 */
export async function GET() {
  const pending = await getGooglePending();
  if (!pending) return NextResponse.json({ pending: null });
  return NextResponse.json({ pending: { email: pending.email, name: pending.name } });
}
