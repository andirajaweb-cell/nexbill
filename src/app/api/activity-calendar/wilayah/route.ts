import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { listWilayah, validWilayahRequest } from "@/lib/activity-calendar/wilayah";

/** GET ?level=provinces|regencies|districts|villages&parent=kode — pemilih lokasi BMKG. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
  const level = req.nextUrl.searchParams.get("level") ?? "";
  const parent = req.nextUrl.searchParams.get("parent");
  if (!validWilayahRequest(level, parent)) return NextResponse.json({ error: "Parameter wilayah tidak valid." }, { status: 400 });
  try {
    return NextResponse.json({ items: await listWilayah(level, parent) }, { headers: { "Cache-Control": "private, max-age=86400" } });
  } catch {
    return NextResponse.json({ error: "Daftar wilayah sedang tidak tersedia — ketik kode desa/kelurahan secara langsung." }, { status: 502 });
  }
}
