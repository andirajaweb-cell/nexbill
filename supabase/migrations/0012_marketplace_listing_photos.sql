-- Marketplace Antar-Outlet — foto barang + penutup celah transaksi di luar aplikasi, 2026-09-24.
--
-- JALANKAN SEBELUM deploy ke Vercel. Kode baru membaca kolom-kolom ini lewat db.select() biasa;
-- kalau kolomnya belum ada, SELURUH halaman Marketplace (Etalase, Barang Saya, Kesepakatan) gagal
-- dimuat. Kalau versi awal file ini (yang hanya berisi image_urls) sudah pernah dijalankan,
-- JALANKAN ULANG — semua perintah di bawah aman diulang.
--
--   marketplace_listings.image_urls — daftar URL foto (maks. 5) sebagai JSON array, urut: foto
--     pertama = sampul. Kolom lama image_url tetap diisi foto pertama.
--
--   marketplace_listings.closed_reason / closed_note — alasan penjual menarik barang dari etalase
--     (wajib dipilih sejak versi ini). Dasar pemantauan barang yang "hilang" setelah ada penawaran.
--
--   marketplace_deals.buyer_contact_phone — No. HP pembeli, diisi saat mengajukan penawaran.
--     Nomor HP KEDUA pihak baru terlihat setelah penjual MENERIMA penawaran.
--
-- Baris lama tidak diubah.

BEGIN;

ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS image_urls          text;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS closed_reason       text;
ALTER TABLE marketplace_listings ADD COLUMN IF NOT EXISTS closed_note         text;
ALTER TABLE marketplace_deals    ADD COLUMN IF NOT EXISTS buyer_contact_phone text;

COMMIT;

-- VERIFIKASI (seharusnya empat baris):
--
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE (table_name = 'marketplace_listings' AND column_name IN ('image_urls','closed_reason','closed_note'))
--      OR (table_name = 'marketplace_deals'    AND column_name = 'buyer_contact_phone');
