import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { getTvState } from "@/lib/tv/service";

/**
 * PUBLIK, hanya-baca, dikenali lewat token layar. Inilah yang di-polling TV setiap beberapa detik.
 *
 * Token dikirim di header Authorization, BUKAN sebagai parameter query. Parameter query tercatat
 * di log akses server, log CDN, dan header Referer — token yang berlaku sampai dicabut tidak boleh
 * tersebar di tempat-tempat itu. `?token=` tetap diterima sebagai cadangan karena sebagian
 * pembungkus WebView TV murah tidak bisa menyetel header, tapi jalur header yang dipakai halaman
 * /tv bawaan.
 *
 * force-dynamic: tanpa ini Next bisa meng-cache balasan di tepi jaringan, dan seluruh gunanya
 * fitur ini — status unit yang benar DETIK INI — ikut hilang. Layar akan memajang "TERSEDIA" pada
 * bilik yang sedang dipakai.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    const token = bearer || (req.nextUrl.searchParams.get("token") ?? "").trim();
    if (!token) return NextResponse.json({ error: "Token layar tidak ada." }, { status: 401 });

    const state = await getTvState(token);
    return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    // Token yang tidak dikenal dibalas 401 supaya halaman /tv bisa membedakannya dari gangguan
    // jaringan sesaat: 401 berarti "pasangan ini sudah dicabut, minta kode baru", sedangkan galat
    // lain berarti "coba lagi sebentar lagi". Tanpa pembedaan itu, layar yang layarnya sudah
    // dihapus dari dashboard akan terus melakukan polling selamanya tanpa memberi tahu siapa pun.
    if (err instanceof Error && err.message === "UNKNOWN_SCREEN") {
      return NextResponse.json({ error: "Layar ini sudah dilepas dari outlet. Minta kode pairing baru." }, { status: 401 });
    }
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
