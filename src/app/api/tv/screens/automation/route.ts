import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { listScreenAutomation } from "@/lib/tv/automation";

/**
 * Status otomatisasi "sesi selesai → screensaver, sesi mulai → HDMI" untuk setiap layar outlet ini,
 * per id layar: kesiapan agent (versi, kemampuan, online), port HDMI, browser, hasil Deteksi TV, dan
 * apakah sudah diverifikasi & dinyalakan. Hanya-baca — boleh untuk semua staf yang login, sama
 * seperti GET /api/tv/screens.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await listScreenAutomation(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
