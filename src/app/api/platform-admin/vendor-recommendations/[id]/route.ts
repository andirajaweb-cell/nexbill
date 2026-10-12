import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { platformVendorRecommendations } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { parseVendorRecInput } from "@/lib/vendor-recommendations/fields";

function authError(err: unknown) {
  if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
  return null;
}

/** Ubah isi / aktifkan / nonaktifkan / jadwal / pendaftaran terkonfirmasi. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { data, error } = parseVendorRecInput(body, true);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const [updated] = await db
      .update(platformVendorRecommendations)
      .set({ ...data, updatedBy: session.sub, updatedAt: new Date().toISOString() })
      .where(eq(platformVendorRecommendations.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Rekomendasi tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Hapus permanen beserta riwayat performanya (event ikut terhapus lewat ON DELETE CASCADE). */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [deleted] = await db.delete(platformVendorRecommendations).where(eq(platformVendorRecommendations.id, id)).returning({ id: platformVendorRecommendations.id });
    if (!deleted) return NextResponse.json({ error: "Rekomendasi tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return authError(err) ?? NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
