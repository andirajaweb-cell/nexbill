import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { getPublicBookingProfile } from "@/lib/booking/public-profile";

/**
 * Publik (tanpa login) untuk /book/[slug]: foto outlet, admin WhatsApp, petunjuk arah, dan cabang lain
 * milik pemilik yang sama. Hanya data yang memang diisi pemilik untuk ditampilkan ke umum.
 */
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Link booking tidak valid." }, { status: 400 });
    const data = await getPublicBookingProfile(slug);
    if (!data) return NextResponse.json({ error: "Outlet tidak ditemukan." }, { status: 404 });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
