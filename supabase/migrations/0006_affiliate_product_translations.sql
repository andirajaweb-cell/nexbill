-- Terjemahan otomatis produk rekomendasi (2026-09-23)
--
-- Menambahkan satu kolom teks untuk menyimpan judul/deskripsi/kategori produk afiliasi dalam lima
-- bahasa selain Indonesia, dihasilkan otomatis saat produk disimpan lewat /platform-admin.
--
-- Bahasa Indonesia sengaja TIDAK ikut disimpan di kolom ini — kolom title/description/category yang
-- sudah ada adalah sumber aslinya sekaligus cadangan saat terjemahan belum tersedia. Produk lama
-- karenanya tetap tampil normal setelah migrasi ini, hanya dalam Bahasa Indonesia, sampai seseorang
-- menyimpan ulang produk tersebut.
--
-- AMAN DIJALANKAN ULANG dan TIDAK MENGUBAH DATA YANG ADA: hanya menambah kolom nullable.

BEGIN;

ALTER TABLE affiliate_products ADD COLUMN IF NOT EXISTS translations_json text;

COMMIT;

-- VERIFIKASI (jalankan terpisah; seharusnya menampilkan satu baris):
--
--   SELECT column_name, data_type, is_nullable
--   FROM information_schema.columns
--   WHERE table_name = 'affiliate_products' AND column_name = 'translations_json';
