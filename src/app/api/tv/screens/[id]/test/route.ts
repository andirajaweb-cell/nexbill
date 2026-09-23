import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { testScreenAutomation, type ScreenTestKind } from "@/lib/tv/automation";

const KINDS: readonly ScreenTestKind[] = ["openScreensaver", "switchHdmi", "getTvInfo"];

/**
 * Menjalankan satu tes di TV sungguhan: buka screensaver, pindah ke HDMI, atau Deteksi TV.
 *
 * Butuh izin manage_settings, bukan sekadar login: tes ini benar-benar mengubah apa yang tampil di
 * TV bilik — kalau dijalankan saat bilik sedang dipakai, pelanggan yang sedang main tiba-tiba
 * melihat screensaver. Itu keputusan pengelola outlet, bukan tombol yang boleh ditekan siapa saja.
 *
 * Selalu HTTP 200 dengan { ok, error?, code?, info? } untuk hasil tes (termasuk yang gagal) —
 * kegagalan tes adalah HASIL yang ingin dilihat merchant, bukan galat server.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menjalankan tes TV." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind;
    if (!KINDS.includes(kind)) return NextResponse.json({ error: "Jenis tes tidak dikenal." }, { status: 400 });

    const result = await testScreenAutomation(session.outletId, id, kind as ScreenTestKind);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
