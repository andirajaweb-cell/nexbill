import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { outlets, staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { IDLE_MINUTES, isSessionFresh } from "@/lib/auth/single-session";
import { logAudit } from "@/lib/audit/log";

/** Perangkat aktif tiap akun staf outlet + status aturan "satu akun satu perangkat". */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_staff")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat sesi staf." }, { status: 403 });
    }
    const [outlet] = await db.select({ on: outlets.singleDeviceLogin }).from(outlets).where(eq(outlets.id, session.outletId)).limit(1);
    const rows = await db
      .select({ id: staffUsers.id, sid: staffUsers.activeSessionId, at: staffUsers.activeSessionAt, device: staffUsers.activeSessionDevice, ip: staffUsers.activeSessionIp })
      .from(staffUsers)
      .where(eq(staffUsers.outletId, session.outletId));
    return NextResponse.json({
      singleDeviceLogin: outlet?.on !== false,
      idleMinutes: IDLE_MINUTES,
      sessions: rows.map((r) => ({
        staffId: r.id,
        hasSession: Boolean(r.sid),
        active: Boolean(r.sid) && isSessionFresh(r.at),
        lastSeen: r.at,
        device: r.device,
        ip: r.ip,
        isYou: r.id === session.sub,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Nyalakan/matikan aturan untuk outlet ini — kebijakan keamanan, hanya Owner (manage_settings + manage_staff). */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const role = session.role as StaffRole;
    if (!hasPermission(role, "manage_staff") || !hasPermission(role, "manage_settings")) {
      return NextResponse.json({ error: "Hanya Owner yang bisa mengubah aturan login." }, { status: 403 });
    }
    const { singleDeviceLogin } = await req.json();
    if (typeof singleDeviceLogin !== "boolean") return NextResponse.json({ error: "Nilai tidak valid." }, { status: 400 });
    await db.update(outlets).set({ singleDeviceLogin }).where(eq(outlets.id, session.outletId));
    await logAudit({ outletId: session.outletId, staffUserId: session.sub, action: "set_single_device_login", entityType: "outlet", entityId: session.outletId, after: { singleDeviceLogin } });
    return NextResponse.json({ singleDeviceLogin });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
