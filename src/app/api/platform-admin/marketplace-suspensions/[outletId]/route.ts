import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { cabutPenangguhan } from "@/lib/marketplace/trust-service";

/** Mencabut penangguhan akses Marketplace sebuah outlet. Body: { note }. Riwayat aduannya tetap tercatat. */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ outletId: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { outletId } = await params;
    const body = await req.json().catch(() => ({}));
    return NextResponse.json(await cabutPenangguhan(outletId, admin.sub, body.note));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
