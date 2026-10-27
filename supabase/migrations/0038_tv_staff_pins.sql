-- PIN per staf untuk sesi dari NEXBILL TV, 2026-10-27.
--  - tv_staff_pins : PIN (bcrypt) tiap staf per outlet. Kasir mengetik PIN-nya sendiri di TV (OK → PIN),
--                    sesi yang dimulai/diubah dari TV tercatat atas nama staf itu, bukan Owner.
-- Hanya tabel BARU. Sebelum dijalankan: TV tetap memakai PIN layar bersama seperti sebelumnya.
-- AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS tv_staff_pins (
  id             text PRIMARY KEY,
  outlet_id      text NOT NULL REFERENCES outlets(id),
  staff_user_id  text NOT NULL REFERENCES staff_users(id),
  pin_hash       text NOT NULL,
  created_at     text NOT NULL,
  updated_at     text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS tv_staff_pins_outlet_staff_idx ON tv_staff_pins (outlet_id, staff_user_id);

alter table public.tv_staff_pins enable row level security;

COMMIT;
