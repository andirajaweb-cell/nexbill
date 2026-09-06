import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { markUnitServiced } from "@/lib/rental/maintenance";
import { describeError } from "@/lib/api/error";

/** Resets a unit's "hours since service" counter to 0 — see lib/rental/maintenance.ts. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_devices")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menandai unit sudah diservis." }, { status: 403 });
    }
    const updated = await markUnitServiced(id, session.outletId, session.sub);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
