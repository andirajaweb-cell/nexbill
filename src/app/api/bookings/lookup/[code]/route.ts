import { NextRequest, NextResponse } from "next/server";
import { getBookingByCode } from "@/lib/rental/bookings";
import { describeError } from "@/lib/api/error";

/** Fast kasir lookup by booking code (typed or scanned from the QR) — powers the "cari kode booking" check-in flow. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  try {
    const outletId = req.nextUrl.searchParams.get("outletId");
    if (!outletId) return NextResponse.json({ error: "outletId wajib diisi" }, { status: 400 });
    const booking = await getBookingByCode(outletId, code.toUpperCase());
    if (!booking) return NextResponse.json({ error: "Kode booking tidak ditemukan." }, { status: 404 });
    return NextResponse.json(booking);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
