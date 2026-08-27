import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { membershipTiers, customers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah membership tier." }, { status: 403 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Tier tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    delete body.outletId;
    const [row] = await db.update(membershipTiers).set({ ...body, updatedAt: new Date().toISOString() }).where(eq(membershipTiers.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Tier tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Blocks deletion (rather than dangling/nulling references) if any customer is currently on this tier — asks the caller to move them off first, since silently downgrading everyone would be a surprising side effect of a delete click. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus membership tier." }, { status: 403 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(membershipTiers).where(eq(membershipTiers.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Tier tidak ditemukan." }, { status: 404 });

    const [inUse] = await db.select({ id: customers.id }).from(customers).where(eq(customers.membershipTierId, id)).limit(1);
    if (inUse) {
      return NextResponse.json({ error: "Tier ini masih dipakai oleh customer — pindahkan customer ke tier lain dulu sebelum menghapus." }, { status: 400 });
    }

    const [row] = await db.delete(membershipTiers).where(eq(membershipTiers.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Tier tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, row });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
