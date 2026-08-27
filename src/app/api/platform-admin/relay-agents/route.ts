import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/db/client";
import { outlets, relayAgents } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { RELAY_WS_PORT, RELAY_HUB_PUBLIC_URL } from "@/lib/relay/config";

/**
 * Cross-tenant Relay Agent (Android TV via Cloud) management — token
 * minting moved here from the outlet-facing /dashboard/devices page on
 * purpose: the hub URL/token/protocol details are NEXBILL's own
 * infrastructure knowledge, not something outlets need to see or manage.
 * Outlets only ever receive the finished token (and the NexbillAgent.exe
 * download) from NEXBILL support — see src/app/dashboard/devices/page.tsx's
 * simplified "Tambah Perangkat" flow, which just needs a TV IP.
 */
export async function GET() {
  try {
    await requirePlatformAdmin();

    const allOutlets = await db.select({ id: outlets.id, name: outlets.name }).from(outlets);
    const allAgents = await db.select().from(relayAgents);
    const agentsByOutlet = new Map<string, typeof allAgents>();
    for (const a of allAgents) {
      const list = agentsByOutlet.get(a.outletId) ?? [];
      list.push(a);
      agentsByOutlet.set(a.outletId, list);
    }

    const rows = allOutlets.map((o) => ({
      outletId: o.id,
      outletName: o.name,
      agents: (agentsByOutlet.get(o.id) ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        status: a.status,
        lastSeenAt: a.lastSeenAt,
        // token intentionally not returned on list — only right after creation, same as the old outlet-facing route.
      })),
    }));

    return NextResponse.json(rows);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Mint a new relay agent token for a given outlet — the token is only ever shown once, in this response. */
export async function POST(req: NextRequest) {
  try {
    await requirePlatformAdmin();
    const body = await req.json();
    if (!body.outletId) return NextResponse.json({ error: "outletId wajib diisi." }, { status: 400 });
    if (!body.name) return NextResponse.json({ error: "Nama relay agent wajib diisi." }, { status: 400 });

    const token = randomBytes(24).toString("hex");
    const [row] = await db.insert(relayAgents).values({ outletId: body.outletId, name: body.name, token }).returning();

    return NextResponse.json({ ...row, wsPort: RELAY_WS_PORT, hubUrl: RELAY_HUB_PUBLIC_URL });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
