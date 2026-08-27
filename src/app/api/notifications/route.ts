import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getNotifications } from "@/lib/notifications";
import type { StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

/** Bell-icon + /dashboard/notifikasi feed — scoped to the caller's own outlet + role automatically via the session, never a client-supplied outletId. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const result = await getNotifications(session.outletId, session.sub, session.role as StaffRole);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
