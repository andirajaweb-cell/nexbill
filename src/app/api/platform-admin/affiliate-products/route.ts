import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { affiliateProducts } from "@/db/schema";
import { requirePlatformAdmin } from "@/lib/auth/platform-session";
import { describeError } from "@/lib/api/error";
import { translateProductFields } from "@/lib/affiliate/translate-product";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const rows = await db.select().from(affiliateProducts);
    return NextResponse.json(rows.sort((a, b) => a.sortOrder - b.sortOrder));
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requirePlatformAdmin();
    const body = await req.json();
    if (!body.title || !body.shopeeUrl) {
      return NextResponse.json({ error: "title dan shopeeUrl wajib diisi." }, { status: 400 });
    }
    /*
     * Terjemahan dibuat SEBELUM insert, tapi kegagalannya tidak menggagalkan apa pun —
     * translateProductFields mengembalikan null alih-alih melempar (lihat doc comment-nya).
     * Produk tetap tersimpan lengkap dan tampil dalam Bahasa Indonesia; yang hilang hanya
     * versi bahasa lainnya, dan itu bisa dilengkapi kapan saja dengan menyimpan ulang.
     */
    const translations = await translateProductFields({
      title: body.title,
      description: body.description || null,
      category: body.category || null,
    });

    const [row] = await db
      .insert(affiliateProducts)
      .values({
        title: body.title,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        shopeeUrl: body.shopeeUrl,
        priceLabel: body.priceLabel || null,
        category: body.category || null,
        translationsJson: translations ? JSON.stringify(translations) : null,
        isActive: body.isActive ?? true,
        sortOrder: Number(body.sortOrder ?? 0),
        updatedBy: session.sub,
      })
      .returning();
    return NextResponse.json({ ...row, translated: !!translations });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "UNAUTHENTICATED") return NextResponse.json({ error: "Belum login." }, { status: 401 });
    return NextResponse.json({ error: describeError(err) }, { status: 400 });
  }
}
