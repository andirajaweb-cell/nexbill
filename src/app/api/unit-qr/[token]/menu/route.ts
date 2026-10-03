import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { getPublicMenu } from "@/lib/unit-qr/service";

/** PUBLIK — menu F&B outlet untuk HP pelanggan (nama, kategori, harga). Tanpa stok/harga modal. */
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const menu = await getPublicMenu(token);
    if (!menu) return NextResponse.json({ error: "QR tidak dikenal atau sudah diganti." }, { status: 404 });
    return NextResponse.json(menu, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
