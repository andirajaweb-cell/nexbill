import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { relayAgents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";

/**
 * Outlet-facing read of relay_agents — pairing tokens for the Android TV
 * relay system (see scripts/relay-hub.ts / relay-agent.ts /
 * adapters/android-tv-relay.ts). Only GET remains outlet-facing: the
 * Devices page uses this to auto-pick an outlet's relay agent when adding a
 * TV, without ever seeing a token. Minting new tokens (POST) moved to
 * /api/platform-admin/relay-agents — the hub URL/token/protocol are NEXBILL
 * team's own infrastructure knowledge, not something outlets manage
 * themselves; they only ever receive a ready-to-use NexbillAgent.exe from
 * NEXBILL support. See src/app/dashboard/devices/page.tsx.
 */

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // Always the caller's own outlet — never trust a client-supplied outletId here.
    const rows = await db.select().from(relayAgents).where(eq(relayAgents.outletId, session.outletId));
    // Never send the raw token back on a plain list — creation (and the token) now only ever happens via platform-admin.
    return NextResponse.json(rows.map((r) => ({ ...r, token: undefined })));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Token minting moved to /api/platform-admin/relay-agents — kept as a stub so old clients get a clear error instead of a 404. */
export async function POST() {
  return NextResponse.json(
    { error: "Pembuatan Relay Agent sekarang ditangani oleh tim NEXBILL. Hubungi support untuk aktivasi kontrol TV outlet ini." },
    { status: 403 }
  );
}
