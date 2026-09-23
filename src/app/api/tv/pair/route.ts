import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { pairTvScreen } from "@/lib/tv/service";

/**
 * PUBLIK — tidak ada sesi staf di sini, dan memang tidak boleh ada.
 *
 * TV di bilik tidak pernah login sebagai siapa pun: ia menukar kode 6 digit berumur pendek dengan
 * token hanya-baca miliknya sendiri. Kalau endpoint ini menuntut sesi, satu-satunya cara
 * memasangkan layar adalah mengetikkan kata sandi pemilik outlet di perangkat yang berdiri di
 * ruang publik dan dipegang siapa saja — persis yang ingin dihindari.
 *
 * Yang membatasi penyalahgunaan ada di lib/tv/pairing.ts dan service.ts: kode diambil dari sumber
 * acak kriptografis tanpa bias, berlaku 30 menit, hangus dalam UPDATE yang sama yang
 * mencocokkannya, dan token hasilnya hanya bisa membaca status satu unit.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await pairTvScreen(body.code);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
