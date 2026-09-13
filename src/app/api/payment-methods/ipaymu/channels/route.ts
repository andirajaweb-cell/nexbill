import { NextResponse } from "next/server";

/** MOVED 2026-09-13 to /api/platform-admin/ipaymu/channels — see test-connection/route.ts's doc
 * comment in this same folder for why. */
export async function GET() {
  return NextResponse.json({ error: "Endpoint ini sudah dipindah ke Platform Admin — tidak lagi bisa diakses dari outlet." }, { status: 410 });
}
