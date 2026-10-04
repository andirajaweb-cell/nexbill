-- Notifikasi push di HP / aplikasi NEXBILL Android, 2026-10-04 (lihat src/lib/push).
--  - push_subscriptions                 : perangkat yang mengaktifkan notifikasi (Web Push).
--  - staff_users.push_categories_json   : pilihan kategori notifikasi per pengguna.
--  - rental_sessions.push_warning_sent_at : push "sisa waktu" sudah dikirim (sekali per sesi).
--  - products.low_stock_notified_at     : push "stok menipis" sudah dikirim.
-- JALANKAN SEBELUM deploy: staff_users, rental_sessions, dan products dibaca dengan select() semua
-- kolom di banyak tempat. AMAN DIJALANKAN ULANG.

BEGIN;

ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS push_categories_json text;
ALTER TABLE rental_sessions ADD COLUMN IF NOT EXISTS push_warning_sent_at text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_notified_at text;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id               text PRIMARY KEY,
  staff_user_id    text NOT NULL REFERENCES staff_users(id),
  outlet_id        text REFERENCES outlets(id),
  endpoint         text NOT NULL,
  p256dh           text NOT NULL,
  auth             text NOT NULL,
  user_agent       text,
  is_android_app   boolean NOT NULL DEFAULT false,
  failure_count    integer NOT NULL DEFAULT 0,
  last_success_at  text,
  created_at       text NOT NULL,
  updated_at       text NOT NULL
);
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'push_subscriptions_endpoint_unique') THEN
    ALTER TABLE push_subscriptions ADD CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS push_subscriptions_staff_idx ON push_subscriptions (staff_user_id);

-- Tabel internal (diakses server saja): RLS aktif TANPA policy, sama seperti platform_leads.
alter table public.push_subscriptions enable row level security;

COMMIT;
