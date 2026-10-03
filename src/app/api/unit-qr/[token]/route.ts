import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { getPublicUnitState } from "@/lib/unit-qr/service";

/**
 * PUBLIK — status satu bilik untuk HP pelanggan yang memindai stiker QR (halaman /u/[token]).
 * Hanya-baca; di-polling beberapa detik sekali. Lihat lib/unit-qr/service.ts untuk batas data.
 */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const state = await getPublicUnitState(token);
    if (!state) return NextResponse.json({ error: "QR tidak dikenal atau sudah diganti. Minta QR terbaru ke kasir." }, { status: 404 });
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
