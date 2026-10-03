import { NextResponse } from "next/server";

/**
 * Digital Asset Links untuk aplikasi NEXBILL Android (Trusted Web Activity) — disajikan di
 * https://dashboard.nexbill.id/.well-known/assetlinks.json lewat rewrite di next.config.ts.
 * Tanpa file ini (atau kalau sidik jari SHA-256 salah) aplikasi tetap jalan tapi menampilkan
 * bilah alamat Chrome di atas, dan Play Store bisa menolaknya.
 *
 * Isi lewat environment variable di Vercel (tanpa ubah kode):
 *   TWA_PACKAGE_NAME          default "id.nexbill.app"
 *   TWA_SHA256_FINGERPRINTS   satu atau beberapa sidik jari dipisah koma, format
 *                             "AA:BB:CC:…" — ambil dari Play Console → Integritas aplikasi →
 *                             App signing (kunci penandatanganan aplikasi), dan juga kunci
 *                             upload/lokal kalau ingin menguji APK hasil build sendiri.
 */
export const dynamic = "force-dynamic";

export function GET() {
  const packageName = (process.env.TWA_PACKAGE_NAME || "id.nexbill.app").trim();
  const fingerprints = (process.env.TWA_SHA256_FINGERPRINTS || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s));
  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=300" } });
}
