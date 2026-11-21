/**
 * Aturan murni penilaian Persediaan vs stok (2026-11-21) — tanpa DB, diuji di
 * inventory-valuation-rules.test.ts. Dipakai audit "Nilai Persediaan vs stok" (audit/prudence.ts)
 * dan jurnal revaluasi saat harga modal diubah (inventory-revaluation.ts).
 */

const round = (n: number) => Math.round(n * 100) / 100;

export interface ValuationProduct {
  id: string;
  name: string;
  stockQty: number;
  costPrice: number | null;
  category: string | null;
  /** Negatif = stok tidak dilacak (lihat stock-tracking-rules.ts). */
  lowStockThreshold: number | null;
}

export interface StockValuation {
  /** Σ stok positif × harga (FIFO: nilai lapisan tersisa) — nilai barang yang benar-benar ada. */
  stockValue: number;
  /**
   * Σ stok minus × harga modal (angka ≤ 0). Penjualan saat stok sudah habis tetap mengkredit
   * Persediaan, jadi buku turun untuk barang yang tidak pernah tercatat masuk — selisih sebesar ini
   * BUKAN barang hilang, melainkan belanja yang belum dicatat. Ditampilkan terpisah.
   */
  negativeValue: number;
  negativeStock: { name: string; stockQty: number }[];
}

/**
 * Nilai stok per outlet. Produk sewa (device_rental) dan produk "tidak dilacak" tidak termasuk
 * Persediaan. `fifoValueByProduct` diisi untuk outlet FIFO: nilai lapisan tersisa per produk
 * (yang memang menjadi dasar HPP), bukan stok × harga modal rata-rata.
 */
export function valueStock(rows: ValuationProduct[], fifoValueByProduct?: Map<string, number>): StockValuation {
  let stockValue = 0;
  let negativeValue = 0;
  const negativeStock: { name: string; stockQty: number }[] = [];
  for (const p of rows) {
    if (p.category === "device_rental") continue;
    if ((p.lowStockThreshold ?? 0) < 0) continue; // tidak dilacak
    if (p.stockQty > 0) {
      const fifo = fifoValueByProduct?.get(p.id);
      stockValue += fifo !== undefined ? fifo : p.stockQty * (p.costPrice ?? 0);
    } else if (p.stockQty < 0) {
      negativeValue += p.stockQty * (p.costPrice ?? 0);
      negativeStock.push({ name: p.name, stockQty: p.stockQty });
    }
  }
  return { stockValue: round(stockValue), negativeValue: round(negativeValue), negativeStock };
}

/**
 * Perubahan nilai Persediaan saat harga modal produk diubah (metode rata-rata). Stok yang ada
 * dinilai ulang: stok × (harga baru − harga lama). Stok 0/minus tidak punya nilai buku untuk
 * dinilai ulang → 0.
 */
export function costRevaluationDelta(stockQty: number, oldCost: number | null, newCost: number | null): number {
  if (!(stockQty > 0)) return 0;
  return round(stockQty * ((newCost ?? 0) - (oldCost ?? 0)));
}
