import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { submitPublicRequest } from "@/lib/unit-qr/service";
import { isRequestType } from "@/lib/unit-qr/rules";

/**
 * PUBLIK — HP pelanggan mengirim permintaan (pesan F&B, minta tambah waktu, panggil kasir).
 * Tidak pernah mengubah tagihan langsung: permintaan masuk antrean dan kasir yang menerima/menolak.
 * Validasi + pembatasan jumlah ada di lib/unit-qr/rules.ts.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json().catch(() => ({}));
    if (!isRequestType(body?.type)) return NextResponse.json({ error: "Jenis permintaan tidak dikenal." }, { status: 400 });
    const row = await submitPublicRequest(token, body.type, body.payload);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
