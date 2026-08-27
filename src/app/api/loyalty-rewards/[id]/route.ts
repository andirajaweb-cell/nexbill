import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { loyaltyRewards, loyaltyRedemptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengubah reward loyalty." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(loyaltyRewards).where(eq(loyaltyRewards.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Reward tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    delete body.outletId;
    const [row] = await db.update(loyaltyRewards).set({ ...body, updatedAt: new Date().toISOString() }).where(eq(loyaltyRewards.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Reward tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Soft-deletes (isActive false) if it's ever been redeemed, so the redemption history keeps a valid reference; otherwise a real delete. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_pricing_promo")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus reward loyalty." }, { status: 403 });
    }
    const { id } = await params;
    const [existing] = await db.select().from(loyaltyRewards).where(eq(loyaltyRewards.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Reward tidak ditemukan." }, { status: 404 });

    const [used] = await db.select({ id: loyaltyRedemptions.id }).from(loyaltyRedemptions).where(eq(loyaltyRedemptions.rewardId, id)).limit(1);
    if (used) {
      const [row] = await db.update(loyaltyRewards).set({ isActive: false, updatedAt: new Date().toISOString() }).where(eq(loyaltyRewards.id, id)).returning();
      if (!row) return NextResponse.json({ error: "Reward tidak ditemukan." }, { status: 404 });
      return NextResponse.json({ ok: true, softDeleted: true, row });
    }
    const [row] = await db.delete(loyaltyRewards).where(eq(loyaltyRewards.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Reward tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, softDeleted: false, row });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
