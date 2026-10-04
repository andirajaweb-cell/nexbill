import { NextRequest, NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError, errorStatus } from "@/lib/api/error";
import { purgeAccountDeletion, adminCancelDeletion } from "@/lib/account-deletion/service";

/** Body: { action: "purge" | "cancel" } — purge = hapus permanen sekarang; cancel = batalkan & aktifkan kembali. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const label = `platform-admin:${admin.email}`;
    if (body.action === "purge") return NextResponse.json(await purgeAccountDeletion(id, label));
    if (body.action === "cancel") {
      await adminCancelDeletion(id, label);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
