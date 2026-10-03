import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { handleStaffRequest, type StaffAction } from "@/lib/unit-qr/service";

/** Kasir menerima / menolak / menyelesaikan permintaan pelanggan. Selalu dibatasi ke outlet sesi. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body?.action as StaffAction;
    if (!["accept", "reject", "done"].includes(action)) return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    await handleStaffRequest(session.outletId, id, action, { id: session.sub, name: session.name }, body?.rejectReason);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
