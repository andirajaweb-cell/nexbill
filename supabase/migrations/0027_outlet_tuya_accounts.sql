-- Beberapa akun Tuya Cloud API per outlet, 2026-10-02.
--
-- Akun Tuya Cloud API gratis (Trial) hanya bisa mengontrol sedikit perangkat (sekitar 8–10).
-- Outlet dengan smart plug lebih banyak dari itu sekarang bisa mendaftarkan beberapa akun Tuya;
-- setiap perangkat Tuya menyimpan akun mana yang dipakainya di devices.config ("accountId").
--
-- Kredensial lama di kolom outlets.tuya_access_id/secret/project_code/region DISALIN menjadi
-- "Akun 1" di tabel baru ini, jadi smart plug yang sudah jalan tetap jalan tanpa diatur ulang
-- (perangkat lama tanpa accountId otomatis memakai akun pertama, dan kalau Device ID-nya
-- ternyata ada di akun lain, sistem mencarinya sendiri lalu menyimpannya).
-- Kolom lama di outlets dibiarkan (tidak dihapus) sebagai cadangan.
--
-- JALANKAN SEBELUM deploy ke Vercel — kontrol smart plug Tuya dan Pengaturan membaca tabel ini.
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS + salinan hanya untuk outlet yang belum punya akun.

BEGIN;

CREATE TABLE IF NOT EXISTS outlet_tuya_accounts (
  id             text PRIMARY KEY,
  outlet_id      text NOT NULL REFERENCES outlets(id),
  label          text NOT NULL,
  access_id      text NOT NULL,
  access_secret  text NOT NULL,
  project_code   text,
  region         text NOT NULL DEFAULT 'sg',   -- cn | us | us_e | eu | eu_w | in | sg
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     text NOT NULL,
  updated_at     text NOT NULL
);
CREATE INDEX IF NOT EXISTS outlet_tuya_accounts_outlet_idx ON outlet_tuya_accounts (outlet_id, sort_order);

INSERT INTO outlet_tuya_accounts (id, outlet_id, label, access_id, access_secret, project_code, region, sort_order, created_at, updated_at)
SELECT gen_random_uuid()::text, o.id, 'Akun 1', o.tuya_access_id, o.tuya_access_secret, o.tuya_project_code,
       COALESCE(o.tuya_region, 'sg'), 0, to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
       to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
FROM outlets o
WHERE COALESCE(o.tuya_access_id, '') <> ''
  AND COALESCE(o.tuya_access_secret, '') <> ''
  AND NOT EXISTS (SELECT 1 FROM outlet_tuya_accounts a WHERE a.outlet_id = o.id);

alter table public.outlet_tuya_accounts enable row level security;
alter table public.outlet_tuya_accounts force row level security;
drop policy if exists tenant_isolation on public.outlet_tuya_accounts;
create policy tenant_isolation on public.outlet_tuya_accounts
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

COMMIT;

-- VERIFIKASI: jumlah akun hasil salinan = jumlah outlet yang sebelumnya sudah mengisi Tuya.
-- SELECT count(*) FROM outlet_tuya_accounts;
-- SELECT count(*) FROM outlets WHERE COALESCE(tuya_access_id,'') <> '' AND COALESCE(tuya_access_secret,'') <> '';
