-- Kalender Bisnis: libur nasional ASEAN (Google Calendar) + kalender akademik per outlet, 2026-11-01.
--  - activity_holidays          : libur nasional / cuti bersama / peringatan per negara (satu sinkron untuk
--                                 semua outlet; sumber Google Calendar "Holidays in <negara>").
--  - activity_academic_events   : libur sekolah/kuliah, UTS (tengah semester), UAS (akhir semester) — diisi
--                                 masing-masing outlet sesuai kalender pendidikan provinsinya.
--  - outlet_calendar_prefs      : negara libur, tampilkan libur, tampilkan kalender akademik per outlet
--                                 (tabel terpisah — outlet_activity_settings tidak diubah).
-- Hanya tabel BARU. Sebelum dijalankan, Kalender Bisnis tetap jalan tanpa libur & jadwal akademik.
-- AMAN DIJALANKAN ULANG. Butuh 0039_activity_calendar.sql sudah dijalankan.

BEGIN;

CREATE TABLE IF NOT EXISTS activity_holidays (
  id          text PRIMARY KEY,
  country     text NOT NULL,
  date        text NOT NULL,
  end_date    text NOT NULL,
  name        text NOT NULL,
  name_en     text,
  kind        text NOT NULL DEFAULT 'public',
  updated_at  text NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_holidays_country_date_idx ON activity_holidays (country, date);

CREATE TABLE IF NOT EXISTS activity_academic_events (
  id          text PRIMARY KEY,
  outlet_id   text NOT NULL REFERENCES outlets(id),
  level       text NOT NULL,
  kind        text NOT NULL,
  title       text NOT NULL,
  start_date  text NOT NULL,
  end_date    text NOT NULL,
  province    text,
  note        text,
  created_by  text,
  created_at  text NOT NULL,
  updated_at  text NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_academic_events_outlet_idx ON activity_academic_events (outlet_id, start_date);

CREATE TABLE IF NOT EXISTS outlet_calendar_prefs (
  outlet_id        text PRIMARY KEY REFERENCES outlets(id),
  holiday_country  text,
  show_holidays    boolean NOT NULL DEFAULT true,
  show_academic    boolean NOT NULL DEFAULT true,
  updated_by       text,
  created_at       text NOT NULL,
  updated_at       text NOT NULL
);

alter table public.activity_holidays enable row level security;
alter table public.activity_academic_events enable row level security;
alter table public.outlet_calendar_prefs enable row level security;

COMMIT;
