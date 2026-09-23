import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { listTvUnitCompatibility } from "@/lib/tv/service";

/**
 * Unit aktif outlet ini beserta kelayakannya untuk TV Screensaver (hanya setup TV Android — lihat
 * lib/tv/eligibility.ts). Dipakai tab Pengaturan > TV Screensaver untuk dropdown pemilihan unit
 * dan ringkasan kompatibilitas.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json(await listTvUnitCompatibility(session.outletId));
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
