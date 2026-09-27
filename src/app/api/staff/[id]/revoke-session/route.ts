import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { revokeSession } from "@/lib/auth/single-session";
import { logAudit } from "@/lib/audit/log";

/** Keluarkan akun staf dari perangkat yang sedang dipakainya — sesi itu langsung tidak berlaku. */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_staff")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola sesi staf." }, { status: 403 });
    }
    const [target] = await db.select({ outletId: staffUsers.outletId, role: staffUsers.role, name: staffUsers.name, device: staffUsers.activeSessionDevice }).from(staffUsers).where(eq(staffUsers.id, id)).limit(1);
    if (!target || target.outletId !== session.outletId || target.role === "superuser") {
      return NextResponse.json({ error: "Staf tidak ditemukan." }, { status: 404 });
    }
    if (target.role === "owner" && session.role !== "owner") {
      return NextResponse.json({ error: "Hanya Owner yang bisa mengeluarkan sesi Owner." }, { status: 403 });
    }
    await revokeSession(id);
    await logAudit({ outletId: session.outletId, staffUserId: session.sub, action: "revoke_staff_session", entityType: "staff_user", entityId: id, before: { device: target.device } });
    return NextResponse.json({ ok: true, self: id === session.sub });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
