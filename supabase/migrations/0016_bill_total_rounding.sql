-- Pembulatan Total Tagihan, 2026-09-25.
--
-- Setelan outlet untuk membulatkan total tagihan ke satuan uang (Rp100/Rp500/Rp1.000), supaya tarif
-- rental per menit tidak lagi meninggalkan sisa receh (mis. Rp83) sebagai Piutang Pelanggan.
-- Selisihnya disimpan per order dan dijurnal ke akun Selisih Pembulatan.
--
-- JALANKAN SEBELUM deploy ke Vercel — kode baru membaca & menulis kolom-kolom ini di setiap order.
-- Default 0 = pembulatan MATI, jadi tidak ada tagihan yang berubah sampai pemilik outlet
-- mengaktifkannya di Pengaturan → Pajak & Billing.
--
-- AMAN DIJALANKAN ULANG.

ALTER TABLE outlets ADD COLUMN IF NOT EXISTS bill_total_rounding_unit integer NOT NULL DEFAULT 0;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS bill_total_rounding_mode text NOT NULL DEFAULT 'nearest';
ALTER TABLE orders  ADD COLUMN IF NOT EXISTS rounding_adjustment double precision NOT NULL DEFAULT 0;
