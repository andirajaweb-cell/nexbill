-- QR Pelanggan per bilik + peringatan waktu di TV, 2026-10-03.
--
--  - rental_units.customer_qr_token     : rahasia di stiker QR bilik → halaman /u/<token> di HP
--                                         pelanggan (sisa waktu, tagihan berjalan, pesan F&B, minta
--                                         tambah waktu, panggil kasir).
--  - unit_customer_requests             : permintaan dari HP pelanggan. TIDAK langsung mengubah
--                                         tagihan — kasir menerima/menolak di Rental PS.
--  - rental_sessions.tv_warning_sent_at : penanda peringatan "sisa waktu" sudah dikirim ke TV
--                                         (sekali per sesi; dikosongkan lagi saat waktu ditambah).
--  - tv_screensaver_settings.*          : setelan peringatan TV, layar Waktu Habis, dan izin QR.
--
-- JALANKAN SEBELUM deploy ke Vercel. rental_units, rental_sessions, dan tv_screensaver_settings
-- dibaca dengan select() semua kolom di banyak tempat (Rental PS, Kasir, TV) — tanpa migrasi ini
-- halaman-halaman itu gagal.
--
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS di semua perintah. Tidak ada data lama yang diubah;
-- peringatan TV MATI secara bawaan.

BEGIN;

ALTER TABLE rental_units ADD COLUMN IF NOT EXISTS customer_qr_token text;
-- Nama constraint sama dengan bawaan Drizzle (.unique() di schema.ts) supaya tidak terbaca "drift".
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rental_units_customer_qr_token_unique') THEN
    ALTER TABLE rental_units ADD CONSTRAINT rental_units_customer_qr_token_unique UNIQUE (customer_qr_token);
  END IF;
END $$;

ALTER TABLE rental_sessions ADD COLUMN IF NOT EXISTS tv_warning_sent_at text;

ALTER TABLE tv_screensaver_settings ADD COLUMN IF NOT EXISTS time_warning_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE tv_screensaver_settings ADD COLUMN IF NOT EXISTS time_warning_minutes integer NOT NULL DEFAULT 5;
ALTER TABLE tv_screensaver_settings ADD COLUMN IF NOT EXISTS time_warning_seconds integer NOT NULL DEFAULT 7;
ALTER TABLE tv_screensaver_settings ADD COLUMN IF NOT EXISTS time_up_screen_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE tv_screensaver_settings ADD COLUMN IF NOT EXISTS unit_qr_order_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE tv_screensaver_settings ADD COLUMN IF NOT EXISTS unit_qr_extend_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS unit_customer_requests (
  id                 text PRIMARY KEY,
  outlet_id          text NOT NULL REFERENCES outlets(id),
  rental_unit_id     text NOT NULL REFERENCES rental_units(id),
  rental_session_id  text REFERENCES rental_sessions(id),
  type               text NOT NULL,                 -- order_fnb | extend_time | call_staff
  payload            text NOT NULL DEFAULT '{}',    -- JSON
  status             text NOT NULL DEFAULT 'pending', -- pending | accepted | rejected | done
  reject_reason      text,
  handled_at         text,
  handled_by         text REFERENCES staff_users(id),
  handled_by_name    text,
  created_at         text NOT NULL,
  updated_at         text NOT NULL
);
CREATE INDEX IF NOT EXISTS unit_customer_requests_outlet_status_idx ON unit_customer_requests (outlet_id, status, created_at);
CREATE INDEX IF NOT EXISTS unit_customer_requests_unit_idx ON unit_customer_requests (rental_unit_id, created_at);

alter table public.unit_customer_requests enable row level security;
alter table public.unit_customer_requests force row level security;
drop policy if exists tenant_isolation on public.unit_customer_requests;
create policy tenant_isolation on public.unit_customer_requests
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

COMMIT;

-- VERIFIKASI:
-- SELECT column_name FROM information_schema.columns WHERE table_name IN ('rental_units','rental_sessions','tv_screensaver_settings')
--   AND column_name IN ('customer_qr_token','tv_warning_sent_at','time_warning_enabled','unit_qr_order_enabled');
-- SELECT to_regclass('public.unit_customer_requests');
