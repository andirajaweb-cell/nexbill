/**
 * "Lacak stok" per produk — aturan murni (tanpa DB), diuji di stock-tracking-rules.test.ts.
 *
 * Tanpa migrasi baru: produk yang TIDAK dilacak ditandai dengan lowStockThreshold negatif
 * (UNTRACKED_STOCK_THRESHOLD). Kebetulan ini juga membuat produk itu otomatis keluar dari semua
 * kueri stok menipis yang sudah ada (stockQty <= lowStockThreshold tidak pernah benar untuk stok 0
 * dan ambang -1; push notifikasi butuh ambang > 0), jadi tidak ada notifikasi/PO otomatis palsu.
 *
 * Produk tidak dilacak: penjualan tidak memotong stok, void/refund tidak mengembalikan stok, HPP
 * tidak diambil dari Persediaan (biaya bahannya dicatat sebagai Pengeluaran), tidak ikut stock
 * opname, dan stoknya ditampilkan "tidak dilacak", bukan angka minus.
 */
export const UNTRACKED_STOCK_THRESHOLD = -1;
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export function isStockTracked(p: { lowStockThreshold?: number | null } | null | undefined): boolean {
  return !p || (p.lowStockThreshold ?? 0) >= 0;
}

/**
 * Nilai lowStockThreshold yang boleh ditulis lewat edit produk / impor Excel: produk tidak dilacak
 * tetap tidak dilacak (hanya saklar khusus yang mengubahnya); produk dilacak tidak boleh negatif.
 */
export function sanitizeLowStockThreshold(requested: unknown, current: number | null | undefined): number | undefined {
  if (requested === undefined) return undefined;
  if ((current ?? 0) < 0) return current ?? UNTRACKED_STOCK_THRESHOLD;
  const n = Math.floor(Number(requested));
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_LOW_STOCK_THRESHOLD;
}
