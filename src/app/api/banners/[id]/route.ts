import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { banners } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { hasPermission, type StaffRole } from "@/lib/auth/permissions";
import { describeError, errorStatus } from "@/lib/api/error";
import { normalizeBannerLink, normalizeBannerTitle } from "@/lib/booking/banner-rules";
import { deleteFromSupabaseStorageByPublicUrl } from "@/lib/storage/supabase-storage";

const EDITABLE_FIELDS = ["imageUrl", "linkUrl", "title", "sortOrder", "isActive"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin mengelola banner." }, { status: 403 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Banner tidak ditemukan." }, { status: 404 });

    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    // Validasi — dulu nilai apa pun ditulis apa adanya (link "javascript:" ikut tampil di halaman publik).
    if ("linkUrl" in patch) patch.linkUrl = normalizeBannerLink(patch.linkUrl);
    if ("title" in patch) patch.title = normalizeBannerTitle(patch.title);
    if ("isActive" in patch) patch.isActive = patch.isActive === true;
    if ("sortOrder" in patch && (!Number.isInteger(patch.sortOrder) || (patch.sortOrder as number) < 0)) delete patch.sortOrder;
    if ("imageUrl" in patch && (typeof patch.imageUrl !== "string" || !/^https?:\/\//i.test(patch.imageUrl))) delete patch.imageUrl;
    patch.updatedAt = new Date().toISOString();

    const [row] = await db.update(banners).set(patch).where(eq(banners.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Banner tidak ditemukan." }, { status: 404 });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: errorStatus(err, 400) });
  }
}

/** Banners have no downstream transactional references (unlike promos), so this is always a hard delete — nothing to preserve history for. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    if (!hasPermission(session.role as StaffRole, "manage_settings")) {
      return NextResponse.json({ error: "Role kamu tidak punya izin menghapus banner." }, { status: 403 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(banners).where(eq(banners.id, id)).limit(1);
    if (!existing || existing.outletId !== session.outletId) return NextResponse.json({ error: "Banner tidak ditemukan." }, { status: 404 });

    const [row] = await db.delete(banners).where(eq(banners.id, id)).returning();
    if (!row) return NextResponse.json({ error: "Banner tidak ditemukan." }, { status: 404 });
    // Gambar ikut dihapus dari storage (dulu tertinggal selamanya). Gagal hapus file tidak menggagalkan.
    await deleteFromSupabaseStorageByPublicUrl(row.imageUrl).catch(() => false);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
