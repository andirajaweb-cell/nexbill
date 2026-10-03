import { NextRequest, NextResponse } from "next/server";
import qrcode from "qrcode";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { ensureUnitQrToken } from "@/lib/unit-qr/service";

/**
 * QR Pelanggan sebuah unit (untuk ditampilkan / dicetak jadi stiker di bilik).
 * GET  → QR saat ini (dibuat otomatis bila belum ada).
 * POST {rotate:true} → ganti QR; stiker lama langsung tidak berlaku (mis. QR difoto lalu disalahgunakan).
 * URL dibangun dari origin permintaan supaya cocok dengan host dashboard yang sedang dipakai.
 */
async function respond(req: NextRequest, id: string, rotate: boolean) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const token = await ensureUnitQrToken(session.outletId, id, rotate);
  const url = `${req.nextUrl.origin}/u/${token}`;
  const qrDataUrl = await qrcode.toDataURL(url, { margin: 1, scale: 8, color: { dark: "#000000", light: "#ffffff" } });
  return NextResponse.json({ url, qrDataUrl });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    return await respond(req, id, false);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    return await respond(req, id, body?.rotate === true);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
