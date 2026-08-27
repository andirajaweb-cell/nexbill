import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { homeRentalPolicyRules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

async function assertOwned(id: string, outletId: string) {
  const [row] = await db.select().from(homeRentalPolicyRules).where(eq(homeRentalPolicyRules.id, id)).limit(1);
  if (!row || row.outletId !== outletId) return null;
  return row;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    if (!(await assertOwned(id, session.outletId))) return NextResponse.json({ error: "Aturan tidak ditemukan." }, { status: 404 });
    const body = await req.json();
    const { id: _ignoreId, outletId: _ignoreOutlet, category: _ignoreCategory, createdAt: _ignoreCreated, ...rest } = body;
    const [row] = await db.update(homeRentalPolicyRules).set({ ...rest, updatedAt: new Date().toISOString() }).where(eq(homeRentalPolicyRules.id, id)).returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_home_rental")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola Home Rental." }, { status: 403 });
    }
    if (!(await assertOwned(id, session.outletId))) return NextResponse.json({ error: "Aturan tidak ditemukan." }, { status: 404 });
    await db.delete(homeRentalPolicyRules).where(eq(homeRentalPolicyRules.id, id));
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
