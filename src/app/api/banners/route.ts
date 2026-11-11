import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { banners } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";
import { normalizeBannerLink, normalizeBannerTitle } from "@/lib/booking/banner-rules";

/** Dashboard listing (caller's own outlet's banners, any status) — ordered the same way the public slideshow plays them, so the admin list previews the real rotation order. */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const rows = await db
      .select()
      .from(banners)
      .where(eq(banners.outletId, session.outletId))
      .orderBy(asc(banners.sortOrder), asc(banners.createdAt));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola banner." }, { status: 403 });
    }

    const body = await req.json();
    if (typeof body.imageUrl !== "string" || !/^https?:\/\//i.test(body.imageUrl)) return NextResponse.json({ error: "Gambar banner wajib diupload dulu." }, { status: 400 });
    // Banner baru selalu di urutan paling akhir (dulu = jumlah baris dari klien, bisa kembar
    // setelah ada yang dihapus sehingga tombol naik/turun tidak berpengaruh).
    const existing = await db.select({ sortOrder: banners.sortOrder }).from(banners).where(eq(banners.outletId, session.outletId));
    const nextOrder = existing.reduce((m, r) => Math.max(m, r.sortOrder), -1) + 1;

    const [row] = await db
      .insert(banners)
      .values({
        outletId: session.outletId,
        imageUrl: body.imageUrl,
        linkUrl: normalizeBannerLink(body.linkUrl),
        title: normalizeBannerTitle(body.title),
        sortOrder: nextOrder,
        isActive: body.isActive !== false,
      })
      .returning();
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}
