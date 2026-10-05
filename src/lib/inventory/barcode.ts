/**
 * Barcode produk — satu tempat untuk normalisasi dan pencocokan, dipakai Kasir (scan), Inventory
 * (tambah/edit produk, Resep/BOM, Belanja Supplier, Purchase Order, Stock Opname), dan validasi
 * server (barcode tidak boleh dipakai dua produk aktif di outlet yang sama, karena scan di Kasir
 * lalu tidak tahu produk mana yang dimaksud).
 */

export interface CodedProduct {
  id: string;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  isActive?: boolean | null;
}

/** Spasi/baris baru dari scanner dibuang; kosong → null. Huruf tidak diubah (Code 39/128 boleh huruf). */
export function normalizeBarcode(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/\s+/g, "");
  return s ? s : null;
}

const eq = (a: string | null | undefined, b: string) => !!a && a.toLowerCase() === b.toLowerCase();

/** Produk yang barcode (atau SKU) persis sama dengan kode hasil scan. Produk aktif didahulukan. */
export function findProductByCode<P extends CodedProduct>(products: P[], code: string): P | null {
  const c = normalizeBarcode(code);
  if (!c) return null;
  const match = (p: P) => eq(p.barcode, c) || eq(p.sku, c);
  return products.find((p) => p.isActive !== false && match(p)) ?? products.find(match) ?? null;
}

/** Produk aktif lain yang sudah memakai barcode ini (untuk validasi tambah/edit). */
export function findBarcodeConflict<P extends CodedProduct>(products: P[], barcode: string | null, excludeId?: string): P | null {
  if (!barcode) return null;
  return products.find((p) => p.id !== excludeId && p.isActive !== false && eq(p.barcode, barcode)) ?? null;
}
