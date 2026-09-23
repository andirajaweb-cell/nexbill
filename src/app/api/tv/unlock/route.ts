import { NextRequest, NextResponse } from "next/server";
import { describeError } from "@/lib/api/error";
import { verifyTvPin } from "@/lib/tv/service";

/**
 * PUBLIK — memeriksa PIN staf yang diketik di TV untuk keluar dari screensaver.
 *
 * Pemeriksaan dilakukan DI SERVER, bukan dengan mengirim PIN (atau hash-nya) ke layar untuk
 * dibandingkan di sana. Apa pun yang sampai ke perangkat itu harus dianggap sudah diketahui orang
 * lain: TV di bilik bisa dibuka menu developer-nya, disadap lalu lintasnya lewat WiFi yang sama,
 * atau sekadar ditinggal menyala. Yang menyeberang ke sana hanya jawaban ya/tidak.
 *
 * Membuka kunci TIDAK memberi akses apa pun ke NEXBILL — tidak ada sesi yang dibuat, tidak ada
 * cookie yang dipasang. Ia hanya menyingkap panel unit hanya-baca yang isinya sudah dikirim
 * /api/tv/state. Jadi PIN yang bocor paling jauh berakibat screensaver bisa ditutup orang lain,
 * bukan pintu masuk ke transaksi atau uang.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const header = req.headers.get("authorization") ?? "";
    const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    const token = bearer || (typeof body.token === "string" ? body.token.trim() : "");
    if (!token) return NextResponse.json({ error: "Token layar tidak ada." }, { status: 401 });

    const ok = await verifyTvPin(token, typeof body.pin === "string" ? body.pin : "");
    // Selalu 200 dengan { ok: false } untuk PIN salah, bukan 401 — 401 di sini akan tercampur
    // dengan "token dicabut" yang ditangani berbeda oleh halaman /tv, dan layar akan mengira
    // dirinya perlu dipasangkan ulang hanya karena seseorang salah ketik satu angka.
    return NextResponse.json({ ok });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
