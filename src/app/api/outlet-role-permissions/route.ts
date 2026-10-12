import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { logAudit } from "@/lib/audit/log";
import { listOutletRolePermissions, setOutletRolePermission, resetOutletRolePermissions } from "@/lib/auth/permissions-store";
import { ALL_PERMISSIONS, OUTLET_EDITABLE_ROLES, hasPermission, isFullAuthorityRole, type Permission, type StaffRole } from "@/lib/auth/permissions";

/**
 * Checklist izin karyawan KHUSUS OUTLET — dibuat Owner untuk karyawannya sendiri (lihat "IZIN
 * KHUSUS OUTLET" di lib/auth/permissions.ts).
 *
 *   GET    → checklist 5 role × semua izin untuk outlet sesi + daftar karyawan per role.
 *   PATCH  { role, permission, granted } → ubah satu centang.
 *   DELETE { role? } → kembalikan satu role (atau semua) ke bawaan NEXBILL.
 *
 * ISOLASI ANTAR-OUTLET: outlet SELALU dari sesi login (session.outletId), tidak pernah dari body
 * atau query. Setiap tulis memakai kunci yang memuat outlet itu, jadi mengubah checklist di satu
 * outlet tidak menyentuh outlet lain — termasuk outlet lain milik pemilik yang sama.
 *
 * Hak: melihat = Owner/Superuser atau pemegang izin "Kelola Staf & Role"; mengubah = hanya
 * Owner/Superuser (karyawan tidak bisa menambah izinnya sendiri).
 */

async function sessionOrError() {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Belum login." }, { status: 401 }) } as const;
  return { session } as const;
}

function canEdit(role: string) {
  return isFullAuthorityRole(role as StaffRole);
}

export async function GET() {
  try {
    const r = await sessionOrError();
    if ("error" in r) return r.error;
    const { session } = r;
    if (!canEdit(session.role) && !hasPermission(session.role as StaffRole, "manage_staff")) {
      return NextResponse.json({ error: "Role kamu tidak punya akses ke checklist izin karyawan." }, { status: 403 });
    }
    const outletId = session.outletId;
    const cells = await listOutletRolePermissions(outletId);
    const staff = await db
      .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role, isActive: staffUsers.isActive })
      .from(staffUsers)
      .where(and(eq(staffUsers.outletId, outletId), eq(staffUsers.isActive, true)));
    return NextResponse.json({
      canEdit: canEdit(session.role),
      roles: OUTLET_EDITABLE_ROLES,
      cells,
      staffByRole: Object.fromEntries(OUTLET_EDITABLE_ROLES.map((role) => [role, staff.filter((s) => s.role === role).map((s) => s.name)])),
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const r = await sessionOrError();
    if ("error" in r) return r.error;
    const { session } = r;
    if (!canEdit(session.role)) return NextResponse.json({ error: "Hanya Owner yang bisa mengubah checklist izin karyawan." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const role = body?.role as StaffRole;
    const permission = body?.permission as Permission;
    if (!OUTLET_EDITABLE_ROLES.includes(role)) return NextResponse.json({ error: "Role ini tidak bisa diatur per outlet." }, { status: 400 });
    if (!ALL_PERMISSIONS.includes(permission)) return NextResponse.json({ error: "Izin tidak dikenal." }, { status: 400 });
    const granted = Boolean(body?.granted);
    const outletId = session.outletId;
    await setOutletRolePermission(outletId, role, permission, granted);
    await logAudit({
      outletId,
      staffUserId: session.sub,
      action: "update_outlet_role_permission",
      entityType: "outlet_role_permission",
      entityId: `${role}:${permission}`,
      before: { role, permission, granted: !granted },
      after: { role, permission, granted },
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const r = await sessionOrError();
    if ("error" in r) return r.error;
    const { session } = r;
    if (!canEdit(session.role)) return NextResponse.json({ error: "Hanya Owner yang bisa mengubah checklist izin karyawan." }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const role = body?.role as StaffRole | undefined;
    if (role && !OUTLET_EDITABLE_ROLES.includes(role)) return NextResponse.json({ error: "Role ini tidak bisa diatur per outlet." }, { status: 400 });
    const outletId = session.outletId;
    await resetOutletRolePermissions(outletId, role);
    await logAudit({
      outletId,
      staffUserId: session.sub,
      action: "reset_outlet_role_permission",
      entityType: "outlet_role_permission",
      entityId: role ?? "all",
      after: { role: role ?? "all", reset: true },
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
