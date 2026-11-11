import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { banners } from "@/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError } from "@/lib/api/error";
import { resolveBannerOrder } from "@/lib/booking/banner-rules";

/**
 * Simpan urutan slideshow sekaligus: body { ids: string[] } → sort_order 0..n-1. Menggantikan tukar
 * dua angka per klik naik/turun, yang tidak berpengaruh bila dua banner punya sort_order sama.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola banner." }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const rows = await db
      .select({ id: banners.id })
      .from(banners)
      .where(eq(banners.outletId, session.outletId))
      .orderBy(asc(banners.sortOrder), asc(banners.createdAt));
    const order = resolveBannerOrder(body?.ids, rows.map((r) => r.id));
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      for (let i = 0; i < order.length; i++) {
        await tx.update(banners).set({ sortOrder: i, updatedAt: now }).where(and(eq(banners.id, order[i]), eq(banners.outletId, session.outletId)));
      }
    });
    return NextResponse.json({ ok: true, ids: order });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}
