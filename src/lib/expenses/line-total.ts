/**
 * Nominal expense = harga per satuan × jumlah (Okt 2026).
 *
 * Kolom `expenses.amount` sejak awal berarti TOTAL biaya (sebelum pajak) — itulah yang dijurnal,
 * dibayar, dan dibandingkan dengan batas approval. Form dulu menampilkan kolom "Jumlah" di samping
 * "Nominal" tetapi tidak pernah mengalikannya: isi Nominal 90.000 dan Jumlah 4 tercatat sebagai
 * Rp90.000, bukan Rp360.000. Sekarang form meminta HARGA PER SATUAN dan menghitung totalnya di sini;
 * server tetap menerima total di `amount`, dan `qty` disimpan sebagai keterangan.
 */

/** Jumlah satuan yang sah: bilangan bulat ≥ 1 (kolom qty bertipe integer). Kosong = 1. null = tidak sah. */
export function parseExpenseQty(raw: unknown): number | null {
  if (raw === "" || raw === null || raw === undefined) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) return null;
  return n;
}

/** Total (dibulatkan ke rupiah) dari harga per satuan × jumlah. */
export function expenseLineTotal(unitPrice: unknown, qty: unknown): number {
  const unit = Number(unitPrice) || 0;
  const q = parseExpenseQty(qty) ?? 1;
  return Math.round(unit * q);
}

/** Harga per satuan dari baris tersimpan (amount = total) — untuk tampilan "4 × Rp90.000". */
export function expenseUnitPrice(amount: number, qty: number | null | undefined): number {
  const q = qty && qty > 0 ? qty : 1;
  return Math.round((amount / q) * 100) / 100;
}
