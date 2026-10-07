import { NextResponse } from "next/server";

/**
 * Cek koneksi Mode Offline (lib/offline/connectivity.ts): perangkat kasir memanggilnya berkala.
 * navigator.onLine tidak cukup — saat WiFi outlet masih tersambung ke router tapi internetnya
 * putus (kasus paling umum), browser tetap menganggap dirinya online. Sekaligus memberi jam server
 * untuk mengoreksi jam perangkat. Tanpa login dan tanpa database supaya murah dan selalu cepat.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
