import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { listRolePermissionMatrix, updateRolePermission, resetRolePermissions } from "@/lib/auth/permissions-store";
import { ALL_ROLES, ALL_PERMISSIONS, type StaffRole, type Permission } from "@/lib/auth/permissions";

const ADMIN_ROLES = ["superuser"];

function authError(err: any) {
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
  if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "Role kamu tidak punya akses Role & Izin (khusus Superuser)." }, { status: 403 });
  return null;
}

/** Full 7-role x N-permission checklist matrix, for the "Role & Izin" tab. */
export async function GET() {
  try {
    await requireRole(ADMIN_ROLES);
    const matrix = await listRolePermissionMatrix();
    return NextResponse.json({ roles: ALL_ROLES, permissions: ALL_PERMISSIONS, matrix });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

/** Toggle one checklist cell: { role, permission, granted }. */
export async function PATCH(req: NextRequest) {
  try {
    await requireRole(ADMIN_ROLES);
    const { role, permission, granted } = await req.json();
    if (!ALL_ROLES.includes(role)) return NextResponse.json({ error: "Role tidak dikenal." }, { status: 400 });
    if (!ALL_PERMISSIONS.includes(permission)) return NextResponse.json({ error: "Izin tidak dikenal." }, { status: 400 });
    await updateRolePermission(role as StaffRole, permission as Permission, Boolean(granted));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Reset one role — or, if `role` omitted, every role — back to the app's hardcoded defaults. Body: { role?: StaffRole }. */
export async function DELETE(req: NextRequest) {
  try {
    await requireRole(ADMIN_ROLES);
    const body = await req.json().catch(() => ({}));
    const role = body?.role as StaffRole | undefined;
    if (role && !ALL_ROLES.includes(role)) return NextResponse.json({ error: "Role tidak dikenal." }, { status: 400 });
    await resetRolePermissions(role);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
