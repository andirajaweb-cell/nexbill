import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { listDeletionRequests, sweepDueAccountDeletions } from "@/lib/account-deletion/service";

/** Daftar permintaan hapus akun. Sekaligus menjalankan purge yang sudah jatuh tempo (cadangan scheduler). */
export async function GET() {
  try {
    await requirePlatformAdmin();
    const purged = await sweepDueAccountDeletions();
    const rows = await listDeletionRequests();
    return NextResponse.json({ rows, purgedNow: purged });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
