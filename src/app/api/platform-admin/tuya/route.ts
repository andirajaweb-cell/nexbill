import { NextResponse } from "next/server";

/**
 * Retired 2026-09-15 along with the legacy shared Tuya Cloud API account (see
 * lib/devices/adapters/tuya.ts's getCreds() doc comment) — every outlet now manages its own Tuya
 * Cloud API credentials from its own Settings page, so this platform-wide account no longer has
 * any outlet depending on it. Kept as a 410 stub rather than deleted outright, since this file tool
 * set has no delete capability.
 */
function gone() {
  return NextResponse.json({ error: "Akun Tuya Cloud API bersama sudah tidak digunakan lagi — setiap outlet kini mengatur Tuya Cloud API-nya sendiri di Settings." }, { status: 410 });
}

export async function GET() {
  return gone();
}

export async function PATCH() {
  return gone();
}
