import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit/log";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_staff")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah data staf." }, { status: 403 });
    }

    const { name, role, isActive, password } = await req.json();

    const [before] = await db.select().from(staffUsers).where(eq(staffUsers.id, id)).limit(1);
    // Same 404 whether the row doesn't exist or belongs to another outlet — don't leak
    // which is which to a caller probing IDs across tenants.
    if (!before || before.outletId !== session.outletId) {
      return NextResponse.json({ error: "Staf tidak ditemukan." }, { status: 404 });
    }
    // "superuser" is reserved — never assignable through this outlet-facing endpoint, not even by
    // an existing superuser/owner promoting someone else. A no-op (row already superuser, role
    // left unset or set to the same value) and demoting a superuser to something else are both
    // still allowed below, provided the caller is a superuser (next check).
    if (role === "superuser" && before.role !== "superuser") {
      return NextResponse.json({ error: "Role Superuser tidak dapat diberikan melalui manajemen staf." }, { status: 400 });
    }
    // Only a superuser may touch an existing superuser account at all (rename, deactivate, demote).
    if (before.role === "superuser" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya akun Superuser yang bisa mengubah akun Superuser." }, { status: 403 });
    }
    // "owner" is the self-service top role — only an existing Owner/Superuser can grant it or
    // touch an existing Owner row, so a manager whose manage_staff permission was loosened via the
    // editable role matrix can't unilaterally mint or edit a co-owner for the outlet.
    if (
      ((role === "owner" && role !== before.role) || before.role === "owner") &&
      session.role !== "owner" &&
      session.role !== "superuser"
    ) {
      return NextResponse.json({ error: "Hanya akun Owner/Superuser yang bisa mengubah akun Owner." }, { status: 403 });
    }

    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name;
    if (role !== undefined) patch.role = role;
    if (isActive !== undefined) patch.isActive = isActive;
    if (password) patch.passwordHash = await bcrypt.hash(password, 10);

    const [updated] = await db.update(staffUsers).set(patch).where(eq(staffUsers.id, id)).returning();

    await logAudit({
      outletId: before.outletId,
      staffUserId: session.sub,
      action: "update_staff",
      entityType: "staff_user",
      entityId: id,
      before: { name: before.name, role: before.role, isActive: before.isActive },
      after: { name: updated.name, role: updated.role, isActive: updated.isActive },
    });

    const { passwordHash: _omit, ...safe } = updated;
    return NextResponse.json(safe);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
