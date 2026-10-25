import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { checkBookingBlock } from "@/lib/booking/no-show";

/** Cek cepat untuk form Booking Baru di dashboard: apakah nomor ini sedang diblokir (outlet dari sesi). */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const phone = req.nextUrl.searchParams.get("phone") ?? "";
    return NextResponse.json(await checkBookingBlock(session.outletId, phone));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
