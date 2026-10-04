import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError, errorStatus } from "@/lib/api/error";
import { getDeletionStatus, requestAccountDeletion, cancelPendingDeletion } from "@/lib/account-deletion/service";

/**
 * Hapus akun & data outlet (Pengaturan → Akun Saya). GET = status, POST = minta kode konfirmasi
 * ke email Owner, DELETE = batalkan permintaan yang belum dikonfirmasi.
 * Lihat src/lib/account-deletion/service.ts.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const status = await getDeletionStatus(session.sub);
    return NextResponse.json({ ...status, canRequest: session.role === "owner" });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 500) });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const result = await requestAccountDeletion(session, typeof body.reason === "string" ? body.reason : undefined);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}

export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    await cancelPendingDeletion(session);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
