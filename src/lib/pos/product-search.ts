/**
 * Pencarian & pengelompokan produk untuk pemilih menu kasir (Kasir POS dan panel "+ F&B" di Rental PS).
 *  - Pencarian banyak kata (urutan bebas) pada nama, plus cocok sebagian pada SKU/barcode.
 *  - Kode persis (hasil scan barcode) dicari terpisah lewat findProductByCode.
 *  - Urutan abjad memakai Intl.Collator (tidak peka huruf besar/kecil, angka dibaca sebagai angka:
 *    "Teh 2" sebelum "Teh 10").
 */

export interface SearchableProduct {
  id: string;
  name: string;
  category: string;
  sku?: string | null;
  barcode?: string | null;
}

const collator = new Intl.Collator("id", { sensitivity: "base", numeric: true });

export function compareText(a: string, b: string): number {
  return collator.compare(a, b);
}

export function matchesProductQuery(p: SearchableProduct, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (p.barcode && p.barcode.toLowerCase().includes(q)) return true;
  if (p.sku && p.sku.toLowerCase().includes(q)) return true;
  const name = p.name.toLowerCase();
  return q.split(/\s+/).filter(Boolean).every((word) => name.includes(word));
}

/** Cocok persis pada barcode/SKU — yang dihasilkan scanner barcode (alat maupun kamera). */
export function findProductByCode<T extends SearchableProduct>(products: T[], code: string): T | undefined {
  const q = code.trim().toLowerCase();
  if (!q) return undefined;
  return products.find((p) => (p.barcode && p.barcode.trim().toLowerCase() === q) || (p.sku && p.sku.trim().toLowerCase() === q));
}

export function sortProductsByName<T extends SearchableProduct>(products: T[]): T[] {
  return [...products].sort((a, b) => compareText(a.name, b.name) || a.id.localeCompare(b.id));
}

export function defaultCategoryLabel(code: string): string {
  return code.replace(/_/g, " ");
}

export interface ProductGroup<T> {
  category: string;
  label: string;
  items: T[];
}

/** Kelompok per kategori — kategori urut abjad label, produk di dalamnya urut abjad nama. */
export function groupProductsByCategory<T extends SearchableProduct>(products: T[], labelOf: (code: string) => string = defaultCategoryLabel): ProductGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const p of products) {
    const key = p.category || "";
    const list = map.get(key);
    if (list) list.push(p);
    else map.set(key, [p]);
  }
  return [...map.entries()]
    .map(([category, items]) => ({ category, label: labelOf(category) || defaultCategoryLabel(category), items: sortProductsByName(items) }))
    .sort((a, b) => compareText(a.label, b.label) || compareText(a.category, b.category));
}
