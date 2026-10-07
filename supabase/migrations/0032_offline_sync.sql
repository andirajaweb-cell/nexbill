-- Mode Offline kasir rental, 2026-10-07 (lihat src/lib/offline). Perangkat kasir merekam aksi
-- (mulai/tambah waktu/jeda/lanjut/tambah F&B/stop/bayar tunai) saat internet putus, lalu mengirimnya
-- ke POST /api/offline/sync. Tabel ini = kunci idempotensi (id buatan perangkat) + jejak audit.
-- Tabel baru saja — tidak ada kolom yang ditambahkan ke tabel lama, jadi fitur lain aman walau kode
-- ter-deploy lebih dulu (sinkron offline akan gagal dengan pesan jelas dan antrean tetap tersimpan
-- di perangkat sampai migrasi ini dijalankan). AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS offline_sync_actions (
  id                 text PRIMARY KEY,
  outlet_id          text NOT NULL REFERENCES outlets(id),
  staff_user_id      text REFERENCES staff_users(id),
  kind               text NOT NULL,
  rental_session_id  text,
  occurred_at        text NOT NULL,
  payload_json       text NOT NULL,
  status             text NOT NULL DEFAULT 'processing', -- processing | done | failed
  result_json        text,
  error              text,
  clock_flagged      boolean NOT NULL DEFAULT false,
  device_label       text,
  attempts           integer NOT NULL DEFAULT 1,
  created_at         text NOT NULL,
  updated_at         text NOT NULL
);
CREATE INDEX IF NOT EXISTS offline_sync_actions_outlet_idx ON offline_sync_actions (outlet_id, created_at);
CREATE INDEX IF NOT EXISTS offline_sync_actions_session_idx ON offline_sync_actions (rental_session_id);

alter table public.offline_sync_actions enable row level security;

COMMIT;
