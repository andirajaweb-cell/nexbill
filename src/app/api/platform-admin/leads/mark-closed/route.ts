import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { markGoogleClosedLeads } from "@/lib/leads/service";

/**
 * POST — semua lead yang menurut Google Maps "tutup permanen" (kolom business_status) dipindah ke
 * status "Tutup / Tidak Ada". Lead yang sudah jadi pelanggan (closing) tidak disentuh.
 */
export async function POST() {
  try {
    const session = await requirePlatformAdmin();
    const result = await markGoogleClosedLeads(session);
    return NextResponse.json(result);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
