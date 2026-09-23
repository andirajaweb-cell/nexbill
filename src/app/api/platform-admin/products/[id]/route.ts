import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { platformProducts, platformPurchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";

const EDITABLE_FIELDS = ["category", "name", "description", "price", "imageUrl", "isActive", "sortOrder", "weightGrams", "lengthCm", "widthCm", "heightCm"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
    patch.updatedAt = new Date().toISOString();
    const [updated] = await db.update(platformProducts).set(patch).where(eq(platformProducts.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/**
 * Menghapus produk katalog — BENAR-BENAR menghapus bila aman, menonaktifkan bila tidak.
 *
 * KENAPA DIUBAH (2026-09-23). Versi sebelumnya selalu soft-delete (isActive: false). Itu keputusan
 * yang benar untuk melindungi riwayat, tapi hasilnya tidak pernah terlihat: daftar di
 * /platform-admin/products menampilkan SEMUA baris termasuk yang nonaktif, jadi menekan "Hapus"
 * membuat produknya tetap di tempatnya, hanya lencananya berubah. Dari sisi admin itu tidak bisa
 * dibedakan dari tombol yang rusak — dan persis di sebelahnya sudah ada sakelar Aktif/Nonaktif yang
 * melakukan hal yang sama, jadi tombol "Hapus" sekadar menduplikasinya dengan nama yang menyesatkan.
 *
 * Sekarang keputusannya dibuat berdasarkan data, bukan diseragamkan:
 *
 *  - Pesanan outlet yang sudah lewat menyimpan nama dan harga produk sebagai SALINAN di
 *    lineItemsJson (lihat checkoutCart/checkoutProductOrder di lib/subscription/service.ts), bukan
 *    sebagai rujukan. Jadi menghapus produknya tidak pernah merusak faktur lama — itulah alasan
 *    hard delete aman di sini, dan alasan doc comment lama tentang "breaking lineItemsJson"
 *    sebenarnya tidak berlaku.
 *
 *  - Yang BENAR-BENAR merujuk adalah platformPurchases.productId (pencatatan modal/COGS internal
 *    NEXBILL). Selama baris itu ada, produknya tidak bisa dihapus tanpa memutus jejak biayanya —
 *    di situlah soft-delete tetap dipakai, dan alasannya dikembalikan ke layar apa adanya alih-alih
 *    dibiarkan tampak seperti kegagalan.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;

    const [existing] = await db.select().from(platformProducts).where(eq(platformProducts.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

    const [referencedByPurchase] = await db
      .select({ id: platformPurchases.id })
      .from(platformPurchases)
      .where(eq(platformPurchases.productId, id))
      .limit(1);

    if (referencedByPurchase) {
      const [updated] = await db
        .update(platformProducts)
        .set({ isActive: false, updatedAt: new Date().toISOString() })
        .where(eq(platformProducts.id, id))
        .returning();
      return NextResponse.json({
        ok: true,
        mode: "deactivated",
        row: updated,
        pesan: `"${existing.name}" tidak bisa dihapus permanen karena masih dipakai di catatan Pembelian/COGS NEXBILL. Produknya dinonaktifkan — hilang dari etalase outlet, tapi catatan modalnya tetap utuh.`,
      });
    }

    await db.delete(platformProducts).where(eq(platformProducts.id, id));
    return NextResponse.json({
      ok: true,
      mode: "deleted",
      pesan: `"${existing.name}" dihapus permanen dari katalog. Faktur outlet yang sudah lewat tidak terpengaruh — isinya disimpan sebagai salinan, bukan rujukan.`,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
