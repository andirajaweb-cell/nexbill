import { NextResponse } from "next/server";

/**
 * Alamat pendek untuk memasang/memperbarui aplikasi NEXBILL TV di Android TV / Google TV:
 * di TV, buka aplikasi "Downloader" lalu ketik nexbill.id/tvapk. APK & latest.json diterbitkan oleh
 * android-tv/build.ps1 -Step publish ke public/downloads/nexbill-tv/. Selama aplikasi belum ada di
 * Google Play, inilah jalur pemasangan tanpa flashdisk.
 */
export function GET(req: Request) {
  return NextResponse.redirect(new URL("/downloads/nexbill-tv/nexbill-tv.apk", req.url), 302);
}
