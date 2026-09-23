import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { getOrCreateTvSettings, updateTvSettings } from "@/lib/tv/service";
import { isFeatureEnabled } from "@/lib/home-rental/feature-flags";

/**
 * Setelan TV Screensaver milik outlet yang sedang login.
 *
 * unlockPinHash TIDAK PERNAH dikembalikan ke klien — hanya bendera hasPin. Mengirim hash bcrypt ke
 * browser tidak membocorkan PIN secara langsung, tapi memberi penyerang bahan untuk menebak PIN
 * 4-6 digit secara luring tanpa batas percobaan. PIN sependek itu akan tumbang dalam hitungan
 * menit.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const [settings, moduleEnabled] = await Promise.all([
      getOrCreateTvSettings(session.outletId),
      isFeatureEnabled(session.outletId, "TV_SCREENSAVER_ENABLED"),
    ]);
    const { unlockPinHash, ...safe } = settings;
    return NextResponse.json({ ...safe, hasPin: !!unlockPinHash, moduleEnabled });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });

    const body = await req.json();
    const settings = await updateTvSettings(session.outletId, body);
    const { unlockPinHash, ...safe } = settings;
    return NextResponse.json({ ...safe, hasPin: !!unlockPinHash });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
