import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { CASH_DEPOSIT_RECEIVER_ROLES } from "@/lib/cash/deposits";
import { describeError } from "@/lib/api/error";

/**
 * Narrow staff lookup just for the Setoran Kas "diterima oleh" picker — deliberately NOT
 * /api/staff (which requires manage_staff, a permission cashiers never have) since a cashier
 * recording a pickup needs to see who's eligible to receive it without being able to see or
 * manage the full staff roster. Only name/role/id — no email, no active-session details.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_cash_deposit")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mencatat setoran kas." }, { status: 403 });
    }
    const rows = await db
      .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role })
      .from(staffUsers)
      .where(and(eq(staffUsers.outletId, session.outletId), eq(staffUsers.isActive, true), inArray(staffUsers.role, CASH_DEPOSIT_RECEIVER_ROLES)));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
