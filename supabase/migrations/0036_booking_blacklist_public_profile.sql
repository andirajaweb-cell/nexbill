-- Blacklist no-show booking PS & profil publik halaman booking, 2026-10-25.
--  - booking_no_show_policies : aturan blokir otomatis per outlet (berapa kali no-show dalam berapa hari).
--  - booking_blacklist        : blokir manual & "lepas blokir" (pengampunan) per nomor WhatsApp.
--  - outlet_public_profiles   : titik lokasi outlet (geo tag) + link Google Maps untuk tombol petunjuk arah.
--  - outlet_public_photos     : foto outlet yang tampil di /book/[slug].
--  - outlet_whatsapp_contacts : satu outlet bisa punya beberapa admin WhatsApp.
-- Hanya tabel BARU — tidak mengubah tabel lama. Sebelum dijalankan: blokir no-show belum aktif,
-- halaman booking tampil seperti sebelumnya (satu tombol WA dari nomor outlet). AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS booking_no_show_policies (
  outlet_id     text PRIMARY KEY REFERENCES outlets(id),
  enabled       boolean NOT NULL DEFAULT true,
  threshold     integer NOT NULL DEFAULT 3,
  window_days   integer NOT NULL DEFAULT 90,
  updated_by    text,
  created_at    text NOT NULL,
  updated_at    text NOT NULL,
  CONSTRAINT booking_no_show_policies_range CHECK (threshold BETWEEN 1 AND 20 AND window_days BETWEEN 7 AND 730)
);

CREATE TABLE IF NOT EXISTS booking_blacklist (
  id           text PRIMARY KEY,
  outlet_id    text NOT NULL REFERENCES outlets(id),
  phone        text NOT NULL,
  kind         text NOT NULL,
  reason       text,
  created_by   text,
  created_at   text NOT NULL,
  lifted_at    text,
  lifted_by    text
);
CREATE INDEX IF NOT EXISTS booking_blacklist_outlet_phone_idx ON booking_blacklist (outlet_id, phone);

CREATE TABLE IF NOT EXISTS outlet_public_profiles (
  outlet_id     text PRIMARY KEY REFERENCES outlets(id),
  latitude      double precision,
  longitude     double precision,
  maps_url      text,
  show_branches boolean NOT NULL DEFAULT true,
  updated_by    text,
  created_at    text NOT NULL,
  updated_at    text NOT NULL
);

CREATE TABLE IF NOT EXISTS outlet_public_photos (
  id          text PRIMARY KEY,
  outlet_id   text NOT NULL REFERENCES outlets(id),
  url         text NOT NULL,
  caption     text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  text NOT NULL
);
CREATE INDEX IF NOT EXISTS outlet_public_photos_outlet_idx ON outlet_public_photos (outlet_id, sort_order);

CREATE TABLE IF NOT EXISTS outlet_whatsapp_contacts (
  id          text PRIMARY KEY,
  outlet_id   text NOT NULL REFERENCES outlets(id),
  label       text NOT NULL,
  phone       text NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  text NOT NULL,
  updated_at  text NOT NULL
);
CREATE INDEX IF NOT EXISTS outlet_whatsapp_contacts_outlet_idx ON outlet_whatsapp_contacts (outlet_id, sort_order);

alter table public.booking_no_show_policies enable row level security;
alter table public.booking_blacklist enable row level security;
alter table public.outlet_public_profiles enable row level security;
alter table public.outlet_public_photos enable row level security;
alter table public.outlet_whatsapp_contacts enable row level security;

COMMIT;
