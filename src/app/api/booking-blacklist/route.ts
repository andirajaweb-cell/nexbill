import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { hasPermission, isFullAuthorityRole, type StaffRole } from "@/lib/auth/permissions";
import { blockPhone, liftBlock, listNoShowOffenders, saveNoShowPolicy } from "@/lib/booking/no-show";
import { logAudit } from "@/lib/audit/log";

/**
 * Blacklist no-show booking (outlet SELALU dari sesi login).
 *  GET  : aturan + daftar nomor yang no-show / diblokir — izin Kelola Booking.
 *  POST : { action: "block" | "lift", phone, reason? } — izin Kelola Booking.
 *  PUT  : aturan { enabled, threshold, windowDays } — Owner atau izin Kelola Pengaturan.
 */
function canView(role: StaffRole) {
  return isFullAuthorityRole(role) || hasPermission(role, "manage_bookings");
}
function canEditPolicy(role: StaffRole) {
  return isFullAuthorityRole(role) || hasPermission(role, "manage_settings");
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const role = session.role as StaffRole;
    if (!canView(role)) return NextResponse.json({ error: "Role kamu tidak punya izin melihat blacklist booking." }, { status: 403 });
    const data = await listNoShowOffenders(session.outletId);
    return NextResponse.json({ ...data, canEditPolicy: canEditPolicy(role) });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!canView(session.role as StaffRole)) return NextResponse.json({ error: "Role kamu tidak punya izin mengubah blacklist booking." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const phone = String(body?.phone ?? "");
    if (body?.action === "block") {
      const r = await blockPhone(session.outletId, phone, typeof body.reason === "string" ? body.reason : null, session.sub);
      await logAudit({ outletId: session.outletId, staffUserId: session.sub, action: "booking_blacklist_block", entityType: "booking_blacklist", entityId: r.phone, after: { reason: body.reason ?? null } });
      return NextResponse.json(r);
    }
    if (body?.action === "lift") {
      const r = await liftBlock(session.outletId, phone, session.sub);
      await logAudit({ outletId: session.outletId, staffUserId: session.sub, action: "booking_blacklist_lift", entityType: "booking_blacklist", entityId: r.phone });
      return NextResponse.json(r);
    }
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!canEditPolicy(session.role as StaffRole)) return NextResponse.json({ error: "Role kamu tidak punya izin mengubah aturan no-show." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const policy = await saveNoShowPolicy(session.outletId, { enabled: body?.enabled !== false, threshold: body?.threshold, windowDays: body?.windowDays }, session.sub);
    return NextResponse.json(policy);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
