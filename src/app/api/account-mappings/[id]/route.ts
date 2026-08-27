import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { accountMappings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { invalidateMappingCache } from "@/lib/accounting/account-mapping";
import { describeError } from "@/lib/api/error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_coa")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Account Mapping." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(accountMappings).where(eq(accountMappings.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    const values: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    for (const key of ["accountId", "label", "isActive"]) {
      if (body[key] !== undefined) values[key] = body[key];
    }
    const [row] = await db.update(accountMappings).set(values).where(eq(accountMappings.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    invalidateMappingCache(row.outletId);
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Deletes a mapping row — falls back to the hardcoded default code the next time that module/key is resolved (see account-mapping.ts), never breaks posting. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_coa")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Account Mapping." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(accountMappings).where(eq(accountMappings.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    const [row] = await db.delete(accountMappings).where(eq(accountMappings.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Mapping tidak ditemukan." }, { status: 404 });
    invalidateMappingCache(row.outletId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
