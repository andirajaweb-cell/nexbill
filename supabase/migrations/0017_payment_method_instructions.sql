-- Arahan pembayaran untuk pelanggan per metode pembayaran, 2026-09-26.
--
-- Saat kasir memilih QRIS / Transfer / e-wallet di Rental, Kasir, Home Rental, atau Membership,
-- aplikasi kini menampilkan ke mana pelanggan harus membayar: gambar QRIS statis milik outlet
-- dan/atau rekening bank outlet (diisi di halaman Pembayaran). Uang selalu masuk ke akun OUTLET,
-- tidak pernah lewat NEXBILL.
--
-- JALANKAN SEBELUM deploy ke Vercel — halaman kasir membaca kolom-kolom ini.
-- Semua kolom opsional (NULL), jadi tidak ada data lama yang berubah.
--
-- AMAN DIJALANKAN ULANG.

ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS qris_image_url      text;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bank_name           text;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bank_account_number text;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS bank_account_holder text;
ALTER TABLE payment_methods ADD COLUMN IF NOT EXISTS customer_note       text;
