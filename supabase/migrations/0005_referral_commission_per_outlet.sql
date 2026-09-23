-- Komisi referral per outlet pada faktur gabungan multi-outlet (2026-09-22)
--
-- MASALAH YANG DIPERBAIKI
--
-- referral_commissions.source_invoice_id semula bertanda UNIQUE: satu faktur langganan hanya boleh
-- melahirkan satu baris komisi. Batasan itu benar selama setiap faktur mewakili satu outlet, dan
-- memang begitulah merchant satu cabang ditagih.
--
-- Merchant multi-cabang berbeda: seluruh cabangnya ditagih lewat SATU faktur gabungan bertipe
-- "group_renewal" (lihat ensureGroupRenewalInvoiceExists di src/lib/subscription/service.ts). Satu
-- faktur seperti itu bisa memuat tiga outlet yang diajak tiga partner berbeda, dan masing-masing
-- partner berhak atas komisinya sendiri. Dengan batasan lama hal itu mustahil dicatat, sehingga
-- accrueReferralCommission memilih menolak seluruh faktur gabungan — dan merchant multi-cabang,
-- yang justru referral paling bernilai, tidak pernah menghasilkan komisi sepeser pun.
--
-- Batasan unik diganti menjadi GABUNGAN (source_invoice_id, referral_conversion_id): satu faktur
-- boleh melahirkan banyak baris komisi, tapi tetap tidak lebih dari satu baris per outlet yang
-- diajak. Sifat idempoten yang dijaga batasan lama tetap utuh — webhook pembayaran yang terkirim
-- dua kali tetap tidak bisa menggandakan komisi siapa pun.
--
-- AMAN DIJALANKAN ULANG. Setiap langkah memakai IF EXISTS / IF NOT EXISTS, jadi menjalankan berkas
-- ini dua kali tidak menimbulkan galat maupun perubahan tambahan.
--
-- TIDAK ADA DATA YANG HILANG. Ini murni penggantian batasan; tidak satu baris komisi pun disentuh.

BEGIN;

-- 1) Lepas batasan unik lama pada source_invoice_id.
--
-- Postgres menamai batasan yang lahir dari `.unique()` Drizzle mengikuti pola
-- "<tabel>_<kolom>_unique" atau "<tabel>_<kolom>_key", tergantung versi yang membuatnya. Keduanya
-- dicoba, dan keduanya boleh tidak ada — pada database yang sudah pernah dimigrasikan, atau yang
-- dibuat setelah perubahan skema ini, memang tidak ada yang perlu dilepas.
ALTER TABLE referral_commissions DROP CONSTRAINT IF EXISTS referral_commissions_source_invoice_id_unique;
ALTER TABLE referral_commissions DROP CONSTRAINT IF EXISTS referral_commissions_source_invoice_id_key;

-- Sebagian versi Drizzle membuatnya sebagai index, bukan constraint.
DROP INDEX IF EXISTS referral_commissions_source_invoice_id_unique;
DROP INDEX IF EXISTS referral_commissions_source_invoice_id_key;

-- 2) Pasang batasan unik gabungan yang baru.
--
-- Dibuat sebagai unique index (bukan constraint) supaya namanya persis sama dengan yang
-- dideklarasikan di src/db/schema.ts — dengan begitu `drizzle-kit push` berikutnya mengenalinya
-- sebagai sudah ada dan tidak mencoba membuat ulang.
CREATE UNIQUE INDEX IF NOT EXISTS referral_commissions_invoice_conversion_idx
  ON referral_commissions (source_invoice_id, referral_conversion_id);

COMMIT;

-- VERIFIKASI (jalankan terpisah sesudahnya; seharusnya menampilkan tepat satu baris, yaitu index
-- gabungan yang baru, dan TIDAK ada lagi index unik atas source_invoice_id saja):
--
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'referral_commissions' AND indexdef ILIKE '%UNIQUE%';
