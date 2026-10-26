import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { getTvCatalog } from "@/lib/tv/tv-sessions";

/**
 * Aplikasi NEXBILL TV: tarif, paket, dan durasi untuk unit layar ini (dikenali dari token layar di
 * header Authorization). Disimpan di TV supaya kasir tetap bisa memulai sesi saat internet putus.
 */
export const dynamic = "force-dynamic";

function bearer(req: NextRequest) {
  const h = req.headers.get("authorization") ?? "";
  return h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : "";
}

export async function GET(req: NextRequest) {
  try {
    const token = bearer(req);
    if (!token) return NextResponse.json({ error: "Token layar tidak ada." }, { status: 401 });
    return NextResponse.json(await getTvCatalog(token, req.headers.get("x-nexbill-device")), { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNKNOWN_SCREEN") return NextResponse.json({ error: "Layar ini sudah dilepas dari outlet." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
