import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { hasPermission, isFullAuthorityRole, type StaffRole } from "@/lib/auth/permissions";
import { getTvWatch, markTvActionReviewed } from "@/lib/tv/tv-watch";

/**
 * Pengawasan NEXBILL TV (outlet dari sesi login). GET: semua staf — supaya kasir juga melihat sesi
 * dari TV yang belum tertagih. POST { id }: tandai sudah ditinjau — Owner atau izin Persetujuan.
 */
function canReview(role: StaffRole) {
  return isFullAuthorityRole(role) || hasPermission(role, "approve_requests");
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const data = await getTvWatch(session.outletId);
    return NextResponse.json({ ...data, canReview: canReview(session.role as StaffRole) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!canReview(session.role as StaffRole)) return NextResponse.json({ error: "Role kamu tidak punya izin menandai catatan ini." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const id = typeof body?.id === "string" ? body.id : "";
    await markTvActionReviewed(session.outletId, id, session.sub);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
