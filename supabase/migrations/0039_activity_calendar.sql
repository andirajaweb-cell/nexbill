-- Kalender Bisnis NEXBILL (cuaca BMKG + jadwal sepak bola Footballdata.io), 2026-10-28.
--  - outlet_activity_settings : lokasi BMKG (kode desa/kelurahan), zona waktu, liga pilihan per outlet.
--  - activity_weather_cache   : prakiraan BMKG terakhir per desa (dipakai bersama outlet di desa yang sama).
--  - activity_weather_daily   : arsip ringkasan prakiraan harian (untuk analisis historis; BUKAN observasi).
--  - activity_football_matches: jadwal & hasil pertandingan (satu sinkron untuk semua outlet).
--  - activity_sync_state      : status sinkron, kuota API, daftar liga.
-- Hanya tabel BARU — tidak mengubah tabel lain. Sebelum dijalankan, halaman Kalender Bisnis menampilkan
-- pesan "jalankan migrasi". AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS outlet_activity_settings (
  outlet_id       text PRIMARY KEY REFERENCES outlets(id),
  adm4_code       text,
  location_label  text,
  timezone        text NOT NULL DEFAULT 'Asia/Jakarta',
  league_ids      text,
  show_weather    boolean NOT NULL DEFAULT true,
  show_matches    boolean NOT NULL DEFAULT true,
  updated_by      text,
  created_at      text NOT NULL,
  updated_at      text NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_weather_cache (
  adm4_code        text PRIMARY KEY,
  payload          text,
  analysis_date    text,
  fetched_at       text,
  last_attempt_at  text,
  last_error       text,
  last_error_at    text,
  created_at       text NOT NULL,
  updated_at       text NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_weather_daily (
  adm4_code      text NOT NULL,
  local_date     text NOT NULL,
  slots          integer NOT NULL DEFAULT 0,
  rain_slots     integer NOT NULL DEFAULT 0,
  precip_total   double precision,
  precip_max     double precision,
  temp_min       double precision,
  temp_max       double precision,
  main_code      integer,
  rain_hours     text,
  analysis_date  text,
  updated_at     text NOT NULL,
  PRIMARY KEY (adm4_code, local_date)
);

CREATE TABLE IF NOT EXISTS activity_football_matches (
  match_id     text PRIMARY KEY,
  league_id    text,
  league_name  text,
  country      text,
  season_id    text,
  kickoff_utc  text NOT NULL,
  status       text,
  home_team    text NOT NULL,
  away_team    text NOT NULL,
  home_logo    text,
  away_logo    text,
  score_home   integer,
  score_away   integer,
  updated_at   text NOT NULL
);
CREATE INDEX IF NOT EXISTS activity_football_matches_kickoff_idx ON activity_football_matches (kickoff_utc);

CREATE TABLE IF NOT EXISTS activity_sync_state (
  key              text PRIMARY KEY,
  payload          text,
  last_success_at  text,
  last_attempt_at  text,
  last_error       text,
  last_error_at    text,
  updated_at       text NOT NULL
);

alter table public.outlet_activity_settings enable row level security;
alter table public.activity_weather_cache enable row level security;
alter table public.activity_weather_daily enable row level security;
alter table public.activity_football_matches enable row level security;
alter table public.activity_sync_state enable row level security;

COMMIT;
