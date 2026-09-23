-- NEXBILL TV Screensaver / Kiosk Display (2026-09-23)
--
-- Layar TV Android di tiap bilik menampilkan branding outlet, harga sewa, QR booking, jam, dan
-- STATUS UNIT SECARA REALTIME saat tidak dipakai — lalu bisa dibuka staf dengan PIN.
--
-- DUA TABEL:
--
--   tv_screensaver_settings — tepat satu baris per outlet (dipaksa oleh unique index), memuat
--     seluruh setelan tampilan: durasi idle, tiga baris teks branding, sakelar tampilkan
--     jam/status/QR/WiFi, warna aksen, PIN (hash), dan mode malam.
--
--   tv_screens — satu baris per LAYAR FISIK yang sudah dipasangkan ke sebuah rental unit.
--     Pairing-nya dibalik dari alur biasa: dashboard membuat baris dan menampilkan kode 6 DIGIT
--     ANGKA, TV yang mengetik kode itu lalu menukarnya dengan token panjang. Sebabnya remote TV —
--     6 digit bisa ditekan di tombol angka, token 40 karakter tidak.
--
-- KEAMANAN — dua hal yang disengaja dan tidak boleh dilonggarkan belakangan:
--
--   1. unlock_pin_hash menyimpan HASH bcrypt, bukan PIN polos. Layar ini berdiri di ruang publik
--      dan endpoint /api/tv/state bersifat publik (hanya bermodal token layar), jadi PIN polos di
--      kolom ini setara menempelkan kunci di pintu.
--
--   2. token hanya memberi akses BACA ke status satu unit dan teks branding outlet — tidak ke
--      transaksi, pelanggan, atau uang. Perangkat di ruang publik yang tidak bisa diawasi tidak
--      boleh memegang sesi staf.
--
-- SAKLAR UTAMA fitur ini BUKAN di tabel ini, melainkan feature flag TV_SCREENSAVER_ENABLED
-- (lib/home-rental/feature-flags.ts) — konsisten dengan Home Rental dan PPOB, dan karena itu
-- tidak perlu kolom maupun migrasi sendiri.
--
-- AMAN DIJALANKAN ULANG: seluruhnya CREATE ... IF NOT EXISTS / drop policy if exists.
--
-- Catatan: id dan created_at/updated_at selalu diisi aplikasi (crypto.randomUUID dan toISOString
-- lewat $defaultFn di Drizzle), jadi default di bawah hanya jaring pengaman untuk insert manual
-- lewat SQL — formatnya sengaja dibuat persis sama dengan ISO milik JavaScript.

BEGIN;

CREATE TABLE IF NOT EXISTS tv_screensaver_settings (
  id                 text PRIMARY KEY,
  outlet_id          text NOT NULL REFERENCES outlets(id),
  idle_minutes       integer NOT NULL DEFAULT 3,
  headline           text,
  tagline            text,
  price_text         text,
  footer_text        text,
  show_clock         boolean NOT NULL DEFAULT true,
  show_unit_status   boolean NOT NULL DEFAULT true,
  show_booking_qr    boolean NOT NULL DEFAULT true,
  show_wifi          boolean NOT NULL DEFAULT false,
  accent_color       text NOT NULL DEFAULT '#22d3ee',
  unlock_pin_hash    text,
  unlock_mode        text NOT NULL DEFAULT 'none',
  night_mode_enabled boolean NOT NULL DEFAULT true,
  night_start_hour   integer NOT NULL DEFAULT 23,
  night_end_hour     integer NOT NULL DEFAULT 6,
  night_dim_percent  integer NOT NULL DEFAULT 60,
  created_at         text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at         text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- Satu baris per outlet. getOrCreateTvSettings() mengandalkan index ini lewat onConflictDoNothing,
-- jadi dua permintaan yang datang bersamaan untuk outlet yang sama tidak bisa membuat dua baris.
CREATE UNIQUE INDEX IF NOT EXISTS tv_screensaver_settings_outlet_idx
  ON tv_screensaver_settings(outlet_id);

CREATE TABLE IF NOT EXISTS tv_screens (
  id                      text PRIMARY KEY,
  outlet_id               text NOT NULL REFERENCES outlets(id),
  rental_unit_id          text REFERENCES rental_units(id),
  name                    text NOT NULL,
  token                   text NOT NULL UNIQUE,
  pairing_code            text,
  pairing_code_expires_at text,
  paired_at               text,
  is_active               boolean NOT NULL DEFAULT true,
  last_seen_at            text,
  created_at              text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  updated_at              text NOT NULL DEFAULT to_char(now() AT TIME ZONE 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

CREATE INDEX IF NOT EXISTS tv_screens_outlet_idx ON tv_screens(outlet_id);

-- UNIQUE, bukan index biasa: kode pairing ditebak-tebak dari TV di ruang publik, jadi dua layar
-- tidak boleh pernah memegang kode aktif yang sama. Postgres memperlakukan NULL sebagai berbeda
-- satu sama lain di unique index, jadi banyak layar yang kodenya sudah hangus (NULL) tetap sah.
CREATE UNIQUE INDEX IF NOT EXISTS tv_screens_pairing_code_idx ON tv_screens(pairing_code);

COMMIT;

-- ============ RLS (mengikuti pola 0001/0002/0004: terpasang tapi belum aktif menegakkan) ============
alter table public.tv_screensaver_settings enable row level security;
alter table public.tv_screensaver_settings force row level security;
drop policy if exists tenant_isolation on public.tv_screensaver_settings;
create policy tenant_isolation on public.tv_screensaver_settings
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

alter table public.tv_screens enable row level security;
alter table public.tv_screens force row level security;
drop policy if exists tenant_isolation on public.tv_screens;
create policy tenant_isolation on public.tv_screens
  using (outlet_id = app_current_outlet_id())
  with check (outlet_id = app_current_outlet_id());

-- CATATAN PENTING soal RLS di atas. /api/tv/state dan /api/tv/pair adalah endpoint PUBLIK — TV
-- tidak punya sesi staf, jadi app.outlet_id tidak akan pernah terpasang untuk permintaan itu.
-- Keduanya mencari baris BERDASARKAN token/kode yang unik secara global, lalu memakai outlet_id
-- yang ditemukan untuk seluruh pembacaan berikutnya. Jadi begitu RLS benar-benar ditegakkan
-- (lihat 0003_tenant_role.sql), kedua route itu harus lebih dulu menyetel app.outlet_id dari
-- outlet_id milik layar yang ketemu — bukan dilewati dari kebijakan ini.
--
-- VERIFIKASI (jalankan terpisah; seharusnya menampilkan dua baris):
--
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('tv_screensaver_settings','tv_screens');
