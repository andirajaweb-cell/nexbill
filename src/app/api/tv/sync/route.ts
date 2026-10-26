import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { syncTvActions } from "@/lib/tv/tv-sessions";
import { SYNC_BATCH_LIMIT } from "@/lib/offline/protocol";

/**
 * Aplikasi NEXBILL TV mengirim sesi yang diatur kasir di TV (mulai, tambah waktu, stop) — termasuk
 * yang direkam saat internet putus. Idempoten per aksi; outlet & unit diambil dari token layar.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const h = req.headers.get("authorization") ?? "";
    const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
    if (!token) return NextResponse.json({ error: "Token layar tidak ada." }, { status: 401 });
    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.actions)) return NextResponse.json({ error: "Format sinkron tidak valid." }, { status: 400 });
    if (body.actions.length > SYNC_BATCH_LIMIT) return NextResponse.json({ error: `Maksimal ${SYNC_BATCH_LIMIT} aksi per sinkron.` }, { status: 400 });
    const result = await syncTvActions(token, body, req.headers.get("x-nexbill-device"));
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNKNOWN_SCREEN") return NextResponse.json({ error: "Layar ini sudah dilepas dari outlet." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
