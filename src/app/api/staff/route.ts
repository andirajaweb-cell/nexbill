import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { staffUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logAudit } from "@/lib/audit/log";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_staff")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin melihat data staf." }, { status: 403 });
    }
    // Always scope to the caller's own outlet — never trust a client-supplied outletId here,
    // this endpoint is the primary staff-account listing surface for the whole app.
    const rows = await db
      .select({ id: staffUsers.id, name: staffUsers.name, role: staffUsers.role, email: staffUsers.email, isActive: staffUsers.isActive, createdAt: staffUsers.createdAt })
      .from(staffUsers)
      .where(eq(staffUsers.outletId, session.outletId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_staff")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin membuat akun staf." }, { status: 403 });
    }

    const { name, email, password, role } = await req.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "name, email, password, role wajib diisi" }, { status: 400 });
    }
    // "superuser" is reserved — it can never be assigned through this outlet-facing endpoint,
    // not even by an existing superuser/owner. It only exists for accounts seeded outside the
    // app (scripts/seed.ts) or set directly in the database.
    if (role === "superuser") {
      return NextResponse.json({ error: "Role Superuser tidak dapat dibuat melalui manajemen staf." }, { status: 400 });
    }
    // "owner" is the self-service top role — only an existing Owner/Superuser can grant it, so a
    // manager whose manage_staff permission was loosened via the editable role matrix can't
    // unilaterally mint a co-owner for the outlet.
    if (role === "owner" && session.role !== "owner" && session.role !== "superuser") {
      return NextResponse.json({ error: "Hanya akun Owner yang bisa membuat akun Owner lain." }, { status: 403 });
    }
    // outletId is always the caller's own — never trust a client-supplied value, this was
    // previously the root cause of an unauthenticated cross-tenant account-takeover bug.
    const outletId = session.outletId;

    const passwordHash = await bcrypt.hash(password, 10);
    const [staff] = await db.insert(staffUsers).values({ outletId, name, email, passwordHash, role }).returning();
    await logAudit({ outletId, staffUserId: session.sub, action: "create_staff", entityType: "staff_user", entityId: staff.id, after: { name, email, role } });
    const { passwordHash: _omit, ...safe } = staff;
    return NextResponse.json(safe);
  } catch (err: unknown) {
    // Drizzle wraps every DB failure as a generic "Failed query: insert into..."
    // on err.message and puts the real SQLite reason (e.g. "UNIQUE constraint
    // failed: staff_users.email") on err.cause.message — describeError() unwraps
    // that. Checking err.message directly (as this used to) meant the UNIQUE
    // check below never matched, so the raw SQL dump leaked into the alert().
    const real = describeError(err);
    const message = real.includes("UNIQUE") ? "Email sudah terdaftar — pakai email lain untuk staf ini." : real;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
