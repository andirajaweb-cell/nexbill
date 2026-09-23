-- Keanggotaan berbayar: masa berlaku + keuntungan yang bisa diatur merchant (2026-09-23)
--
-- APA YANG BERUBAH
--
--   membership_tiers.validity_days      masa berlaku keanggotaan berbayar, dalam hari.
--                                       0 = seumur hidup (nilai default, jadi SEMUA tier yang
--                                       sudah ada tetap berperilaku persis seperti sekarang).
--   membership_tiers.free_play_minutes  bonus menit main gratis yang dijanjikan tier ini.
--   membership_tiers.free_fnb_amount    nilai F&B gratis (Rp) yang dijanjikan tier ini.
--   customers.membership_expires_at     kapan keanggotaan berbayar customer ini habis.
--                                       NULL = tanpa batas waktu.
--
-- Kolom `benefits` pada membership_tiers TIDAK dibuat di sini — kolom itu sudah lama ada di tabel,
-- hanya belum pernah ditampilkan di layar mana pun. Perubahan ini yang akhirnya memunculkannya.
--
-- KENAPA SEMUA DEFAULT-NYA "TIDAK BERUBAH". Tier lama mendapat validity_days = 0, dan customer
-- lama mendapat membership_expires_at = NULL. Keduanya berarti "tanpa batas waktu", sehingga tidak
-- ada satu pun member yang tiba-tiba kehilangan diskonnya karena migrasi ini. Masa berlaku baru
-- mulai berlaku untuk pembelian/perpanjangan SETELAH merchant sendiri mengisi masa berlakunya.
--
-- AMAN DIJALANKAN ULANG: semuanya ADD COLUMN IF NOT EXISTS, tidak ada data yang ditulis ulang.

BEGIN;

ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS validity_days integer NOT NULL DEFAULT 0;
ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS free_play_minutes integer NOT NULL DEFAULT 0;
ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS free_fnb_amount double precision NOT NULL DEFAULT 0;
ALTER TABLE membership_tiers ADD COLUMN IF NOT EXISTS benefits text;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS membership_expires_at text;

COMMIT;

-- VERIFIKASI (jalankan terpisah; seharusnya menampilkan lima baris):
--
--   SELECT table_name, column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE (table_name = 'membership_tiers' AND column_name IN ('validity_days','free_play_minutes','free_fnb_amount','benefits'))
--      OR (table_name = 'customers' AND column_name = 'membership_expires_at')
--   ORDER BY table_name, column_name;
