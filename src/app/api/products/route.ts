import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/auth/session";
import { describeError } from "@/lib/api/error";
import { recordOpeningStock } from "@/lib/accounting/inventory-postings";
import { lockEntity } from "@/lib/accounting/journal";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    // No cap before — fine while catalogs stay small, but with no ceiling as merchandise/SKU
    // count grows. 1000 is well above any real outlet's catalog today; this is a safety ceiling,
    // not an active pagination limit (POS product picker and Inventory both expect the full list).
    const rows = await db.select().from(products).where(eq(products.outletId, session.outletId)).limit(1000);
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Belum login." }, { status: 401 });
    const body = await req.json();
    const { outletId: _ignoredOutlet, ...rest } = body;
    const name = typeof rest.name === "string" ? rest.name.trim().replace(/s+/g, " ") : "";
    if (!name) return NextResponse.json({ error: "Nama produk wajib diisi." }, { status: 400 });
    // Product + its Stok Awal movement + opening Persediaan journal commit together.
    //
    // Penjaga produk ganda di sisi server (lapisan kedua di belakang modal loading di layar): satu
    // klik ganda dulu membuat dua produk sama persis — DAN dua kali stok awal + jurnal Persediaan.
    // Kunci per outlet+nama membuat permintaan kedua menunggu yang pertama selesai, lalu melihat
    // produknya sudah ada dan ditolak.
    const row = await db.transaction(async (tx) => {
      await lockEntity(tx, `product_name:${session.outletId}:${name.toLowerCase()}`);
      const [existing] = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.outletId, session.outletId), eq(products.isActive, true), sql`lower(${products.name}) = lower(${name})`))
        .limit(1);
      if (existing) throw new DuplicateProductError(name);
      const [created] = await tx.insert(products).values({ ...rest, name, outletId: session.outletId }).returning();
      await recordOpeningStock(session.outletId, [created], session.sub, tx);
      return created;
    });
    return NextResponse.json(row);
  } catch (err: unknown) {
    return NextResponse.json({ error: describeError(err) }, { status: err instanceof DuplicateProductError ? 409 : 400 });
  }
}

class DuplicateProductError extends Error {
  constructor(name: string) {
    super(`Produk "${name}" sudah ada. Untuk menambah stoknya, pakai tombol Stok pada produk itu (atau Belanja Supplier) — jangan membuat produk baru.`);
  }
}
