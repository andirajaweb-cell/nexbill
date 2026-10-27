import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { listStaffPins, removeStaffPin, setStaffPin } from "@/lib/tv/staff-pins";

/**
 * PIN per staf untuk NEXBILL TV (Pengaturan › TV Screensaver). Hanya peran dengan izin
 * manage_settings. PIN/hash tidak pernah dikirim balik — hanya bendera hasPin.
 */
async function guard() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) };
  if (!hasPermission(session.role as StaffRole, "manage_settings")) {
    return { error: NextResponse.json({ error: "Role kamu tidak punya izin mengatur PIN TV." }, { status: 403 }) };
  }
  return { session };
}

function migrationError(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "42P01" || e?.cause?.code === "42P01";
}

export async function GET() {
  const g = await guard();
  if (g.error) return g.error;
  try {
    return NextResponse.json({ staff: await listStaffPins(g.session.outletId) });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;
  try {
    const body = await req.json().catch(() => ({}));
    await setStaffPin(g.session.outletId, String(body.staffUserId ?? ""), String(body.pin ?? ""));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (migrationError(err)) return NextResponse.json({ error: "Jalankan migrasi 0038_tv_staff_pins.sql dulu." }, { status: 503 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const g = await guard();
  if (g.error) return g.error;
  try {
    await removeStaffPin(g.session.outletId, req.nextUrl.searchParams.get("staffUserId") ?? "");
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
