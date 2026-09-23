import { NextRequest, NextResponse } from "next/server";
import qrcode from "qrcode";
import { describeError } from "@/lib/api/error";
import { getTvState } from "@/lib/tv/service";

/**
 * PUBLIK — QR booking untuk layar ini, sebagai data-URL PNG.
 *
 * Endpoint terpisah dari /api/tv/state dengan sengaja: gambar QR berukuran beberapa kilobyte dan
 * ISINYA TIDAK PERNAH BERUBAH selama slug outlet tetap, sedangkan /state di-polling setiap
 * beberapa detik oleh setiap layar di setiap outlet. Menitipkannya di /state berarti mengirim
 * ulang gambar yang sama ribuan kali sehari per layar — pemborosan yang paling terasa justru di
 * tempat fitur ini dipakai: WiFi outlet yang pas-pasan.
 *
 * URL-nya dibangun dari slug outlet MILIK LAYAR INI (lewat getTvState), bukan dari parameter yang
 * dikirim TV. Kalau tujuan QR-nya bisa ditentukan pemanggil, endpoint ini berubah menjadi mesin
 * pembuat QR untuk URL apa pun — termasuk URL penipuan yang lalu tampil di layar resmi outlet.
 */
export async function GET(req: NextRequest) {
  try {
    const header = req.headers.get("authorization") ?? "";
    const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    const token = bearer || (req.nextUrl.searchParams.get("token") ?? "").trim();
    if (!token) return NextResponse.json({ error: "Token layar tidak ada." }, { status: 401 });

    const state = await getTvState(token);
    if (!state.bookingUrl) return NextResponse.json({ qrDataUrl: null, url: null });

    const origin = req.nextUrl.origin;
    const url = `${origin}${state.bookingUrl}`;
    // Margin dikecilkan dan skala dinaikkan karena QR ini dipindai dari jarak beberapa meter di
    // ruangan remang — bukan dari layar ponsel sejengkal dari mata. Kontras dibiarkan hitam di
    // atas putih murni; QR berwarna senada tema memang lebih cantik tapi jauh lebih sering gagal
    // dipindai kamera ponsel murah.
    const qrDataUrl = await qrcode.toDataURL(url, { margin: 1, scale: 8, color: { dark: "#000000", light: "#ffffff" } });
    return NextResponse.json({ qrDataUrl, url });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNKNOWN_SCREEN") {
      return NextResponse.json({ error: "Layar ini sudah dilepas dari outlet." }, { status: 401 });
    }
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
