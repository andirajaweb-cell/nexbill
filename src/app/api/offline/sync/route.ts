import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { processOfflineBatch } from "@/lib/offline/server-sync";
import { SYNC_BATCH_LIMIT } from "@/lib/offline/protocol";

/**
 * Menerima antrean aksi Mode Offline dari perangkat kasir dan memutarnya ulang secara berurutan
 * (lib/offline/server-sync.ts). Idempoten per aksi — aman dikirim ulang.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json().catch(() => null);
    const actions = Array.isArray(body?.actions) ? body.actions : null;
    if (!actions) return NextResponse.json({ error: "Format sinkron tidak valid." }, { status: 400 });
    if (actions.length > SYNC_BATCH_LIMIT) return NextResponse.json({ error: `Maksimal ${SYNC_BATCH_LIMIT} aksi per sinkron.` }, { status: 400 });
    const offset = typeof body.clockOffsetMs === "number" && Number.isFinite(body.clockOffsetMs) ? body.clockOffsetMs : null;
    const deviceLabel = typeof body.deviceLabel === "string" ? body.deviceLabel : null;
    const result = await processOfflineBatch({ outletId: session.outletId, staffUserId: session.sub, currentClockOffsetMs: offset, deviceLabel }, actions);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
