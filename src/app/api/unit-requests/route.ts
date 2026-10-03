import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { listStaffRequests } from "@/lib/unit-qr/service";

/** Permintaan pelanggan dari QR bilik (12 jam terakhir) untuk panel kasir di Rental PS. */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const requests = await listStaffRequests(session.outletId);
    return NextResponse.json({ requests, pendingCount: requests.filter((r) => r.status === "pending").length });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
