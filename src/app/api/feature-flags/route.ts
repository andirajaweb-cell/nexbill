import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { listFeatureFlags } from "@/lib/home-rental/feature-flags";

/**
 * Any logged-in staff member can READ the flag list — the sidebar, Home
 * Rental pages, and other UI need this to decide what to show/hide.
 * WRITING a flag (see [key]/route.ts) is superuser only.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const flags = await listFeatureFlags(session.outletId);
    return NextResponse.json({ flags });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
