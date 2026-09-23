import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { affiliateProducts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { translateProductFields } from "@/lib/affiliate/translate-product";

const EDITABLE_FIELDS = ["title", "description", "imageUrl", "shopeeUrl", "priceLabel", "category", "isActive", "sortOrder"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requirePlatformAdmin();
    const { id } = await params;
    const body = await req.json();
    const [existing] = await db.select().from(affiliateProducts).where(eq(affiliateProducts.id, id)).limit(1);
    if (!existing) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });

    const patch: Record<string, unknown> = {};
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) patch[key] = body[key];
    }

    /*
     * Terjemahan HANYA dibuat ulang kalau teks yang diterjemahkan benar-benar berubah.
     *
     * Tanpa pemeriksaan ini, setiap penyunting apa pun memicu panggilan AI — termasuk yang sama
     * sekali tidak menyentuh teks, seperti menggeser urutan tampilan atau menonaktifkan produk.
     * Itu membayar biaya dan menunggu latensi untuk pekerjaan yang hasilnya dijamin identik.
     *
     * Dibandingkan terhadap nilai yang TERSIMPAN, bukan sekadar "apakah kolomnya dikirim" — form
     * admin mengirim seluruh isian setiap kali disimpan, jadi memeriksa keberadaan kolom saja akan
     * selalu bernilai benar dan tidak menyaring apa pun.
     */
    const nextTitle = (patch.title as string | undefined) ?? existing.title;
    const nextDescription = (patch.description as string | null | undefined) ?? existing.description;
    const nextCategory = (patch.category as string | null | undefined) ?? existing.category;
    const textChanged =
      nextTitle !== existing.title || nextDescription !== existing.description || nextCategory !== existing.category;
    // Produk lama yang belum pernah punya terjemahan ikut dilengkapi saat disunting, meski teksnya
    // tidak berubah — itu satu-satunya kesempatan alami untuk menyusulkannya tanpa perintah khusus.
    const needsBackfill = !existing.translationsJson;

    let translated = false;
    if (textChanged || needsBackfill) {
      const translations = await translateProductFields({
        title: nextTitle,
        description: nextDescription,
        category: nextCategory,
      });
      if (translations) {
        patch.translationsJson = JSON.stringify(translations);
        translated = true;
      }
    }

    patch.updatedBy = session.sub;
    patch.updatedAt = new Date().toISOString();
    const [updated] = await db.update(affiliateProducts).set(patch).where(eq(affiliateProducts.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ...updated, translated });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}

/** Hard delete — these are pure outbound links with no invoice/order history tied to them, unlike platformProducts. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePlatformAdmin();
    const { id } = await params;
    const [deleted] = await db.delete(affiliateProducts).where(eq(affiliateProducts.id, id)).returning();
    if (!deleted) return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
