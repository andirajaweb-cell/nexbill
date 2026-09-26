-- Kontrol Shift & Kasir (anti-fraud / selisih kas), 2026-09-26.
--
-- 1. payments.shift_id — shift kasir yang MENERIMA pembayaran. Sebelumnya Ekspektasi Kas hanya
--    membaca orders.shift_id, yang tidak pernah diisi oleh Kasir/Rental, sehingga penjualan tunai
--    tidak pernah masuk hitungan kas shift.
-- 2. payments.confirmed_by / confirmation_ref — siapa yang menandai QRIS/Transfer diterima dan
--    nomor referensinya.
-- 3. shifts.closing_float / expected_opening_cash / opening_note / closed_by / close_note —
--    serah terima laci dan siapa yang menutup shift.
-- 4. outlets.max_manual_discount_percent / allow_multiple_open_shifts — batas diskon manual kasir
--    dan satu shift terbuka per outlet.
--
-- JALANKAN SEBELUM deploy ke Vercel. Semua kolom baru opsional atau punya default, jadi data lama
-- tidak berubah. AMAN DIJALANKAN ULANG.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS shift_id          text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmed_by      text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS confirmation_ref  text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_shift_id text;
CREATE INDEX IF NOT EXISTS payments_shift_idx ON payments (shift_id);

ALTER TABLE shifts ADD COLUMN IF NOT EXISTS closing_float          double precision;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS expected_opening_cash  double precision;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS opening_note           text;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS closed_by              text;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS close_note             text;

ALTER TABLE outlets ADD COLUMN IF NOT EXISTS max_manual_discount_percent double precision;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS allow_multiple_open_shifts  boolean NOT NULL DEFAULT false;
