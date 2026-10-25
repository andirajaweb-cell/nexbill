-- Papan lobi publik & Saldo waktu member, 2026-10-25.
--  - outlet_lobby_settings        : papan lobi /lobi/[slug] (aktif/tidak, teks pengumuman berjalan).
--  - customer_time_credits        : saldo waktu (menit + nilai rupiah) per member.
--  - time_credit_transactions     : riwayat saldo waktu (simpan sisa sesi, pakai, kembali, batal).
-- Hanya tabel BARU — tidak mengubah tabel lama, jadi aman di-deploy sebelum atau sesudah migrasi
-- ini dijalankan (sebelum dijalankan: papan lobi memakai pengaturan bawaan, saldo waktu belum tampil).
-- AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS outlet_lobby_settings (
  outlet_id     text PRIMARY KEY REFERENCES outlets(id),
  enabled       boolean NOT NULL DEFAULT true,
  announcement  text,
  updated_by    text,
  created_at    text NOT NULL,
  updated_at    text NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_time_credits (
  customer_id   text PRIMARY KEY REFERENCES customers(id),
  outlet_id     text NOT NULL REFERENCES outlets(id),
  minutes       integer NOT NULL DEFAULT 0,
  value         double precision NOT NULL DEFAULT 0,
  created_at    text NOT NULL,
  updated_at    text NOT NULL,
  CONSTRAINT customer_time_credits_nonneg CHECK (minutes >= 0 AND value >= 0)
);
CREATE INDEX IF NOT EXISTS customer_time_credits_outlet_idx ON customer_time_credits (outlet_id);

CREATE TABLE IF NOT EXISTS time_credit_transactions (
  id                 text PRIMARY KEY,
  outlet_id          text NOT NULL REFERENCES outlets(id),
  customer_id        text NOT NULL REFERENCES customers(id),
  rental_session_id  text REFERENCES rental_sessions(id),
  type               text NOT NULL,
  minutes            integer NOT NULL,
  value              double precision NOT NULL DEFAULT 0,
  journal_entry_id   text,
  staff_user_id      text,
  note               text,
  created_at         text NOT NULL
);
CREATE INDEX IF NOT EXISTS time_credit_tx_customer_idx ON time_credit_transactions (customer_id, created_at);
CREATE INDEX IF NOT EXISTS time_credit_tx_session_idx ON time_credit_transactions (rental_session_id);
-- Sisa satu sesi hanya boleh disimpan sekali.
CREATE UNIQUE INDEX IF NOT EXISTS time_credit_tx_one_save_per_session ON time_credit_transactions (rental_session_id) WHERE type = 'save';

-- Tabel internal (diakses server saja): RLS aktif TANPA policy, sama seperti tabel lain.
alter table public.outlet_lobby_settings enable row level security;
alter table public.customer_time_credits enable row level security;
alter table public.time_credit_transactions enable row level security;

COMMIT;
