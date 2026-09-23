import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { createTvScreen, listTvScreens } from "@/lib/tv/service";

/**
 * Daftar layar TV outlet ini, dan pembuatan layar baru.
 *
 * `token` milik layar TIDAK PERNAH dikembalikan oleh endpoint mana pun di dashboard — hanya
 * pairingCode yang berumur pendek. Itu batas yang disengaja: token berlaku sampai layarnya
 * dihapus, jadi kalau ia pernah tampil di layar dashboard, ia juga pernah tampil di riwayat
 * browser, tangkapan layar grup WhatsApp, dan log siapa pun yang menonton. Kode 6 digit yang
 * hangus dalam 30 menit jauh lebih aman untuk dibacakan lewat telepon ke orang di lokasi.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await listTvScreens(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const body = await req.json();
    const screen = await createTvScreen(session.outletId, body.name, body.rentalUnitId ?? null);
    return NextResponse.json({
      id: screen.id,
      name: screen.name,
      rentalUnitId: screen.rentalUnitId,
      pairingCode: screen.pairingCode,
      pairingCodeExpiresAt: screen.pairingCodeExpiresAt,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
