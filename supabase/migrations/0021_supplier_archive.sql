-- Supplier bisa diarsipkan (Inventory Control → Supplier), 2026-09-26.
--
-- Supplier yang sudah punya transaksi (faktur, PO, retur, expense, aset) tidak boleh dihapus —
-- riwayatnya harus tetap menunjuk ke nama yang benar. Mengarsipkan menyembunyikannya dari pilihan
-- transaksi baru tanpa menyentuh riwayat. Supplier tanpa transaksi tetap bisa dihapus.
--
-- JALANKAN SEBELUM deploy ke Vercel — daftar supplier membaca kolom ini.
-- AMAN DIJALANKAN ULANG. Tidak ada data lama yang diubah (semua supplier tetap aktif).

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS archived_at text;

-- VERIFIKASI (harus 1 baris):
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'suppliers' AND column_name = 'archived_at';
