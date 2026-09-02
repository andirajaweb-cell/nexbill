import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getHelpOverridesForOutlet } from "@/lib/help/overrides";
import { describeError } from "@/lib/api/error";

/**
 * Any logged-in staff member can READ the merged Help content (everyone views the Help & Guide
 * page) — the write side (PUT/DELETE on /api/help-content/[categoryId]) is what's restricted to
 * the Superuser role. See src/lib/help/overrides.ts for the merge helper this feeds.
 */
export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const overrides = await getHelpOverridesForOutlet(session.outletId);
    return NextResponse.json(overrides);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
