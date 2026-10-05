import { db, type DbOrTx } from "@/db/client";
import { products } from "@/db/schema";
import { and, eq, ne, sql } from "drizzle-orm";

/** Ditolak dengan 409: barcode yang sama di dua produk aktif membuat scan Kasir tidak bisa memilih. */
export class DuplicateBarcodeError extends Error {
  constructor(barcode: string, productName: string) {
    super(`Barcode ${barcode} sudah dipakai produk "${productName}". Satu barcode hanya untuk satu produk aktif.`);
  }
}

export async function assertBarcodeAvailable(outletId: string, barcode: string | null, excludeId?: string, dbc: DbOrTx = db) {
  if (!barcode) return;
  const [hit] = await dbc
    .select({ id: products.id, name: products.name })
    .from(products)
    .where(
      and(
        eq(products.outletId, outletId),
        eq(products.isActive, true),
        sql`lower(${products.barcode}) = lower(${barcode})`,
        ...(excludeId ? [ne(products.id, excludeId)] : [])
      )
    )
    .limit(1);
  if (hit) throw new DuplicateBarcodeError(barcode, hit.name);
}
