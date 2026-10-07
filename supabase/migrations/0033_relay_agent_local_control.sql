-- Kontrol Lokal saat internet putus (NexbillAgent v1.4, 2026-10-07; lihat src/lib/relay/local-control.ts).
-- Agent melaporkan alamat LAN-nya saat tersambung ke Relay Hub; dashboard memakainya untuk
-- menampilkan alamat halaman Kontrol Lokal (http://<ip>:8737) dan papan kasir offline memakainya
-- untuk menjangkau agent. Tabel baru saja (tidak mengubah relay_agents), jadi hub & dashboard tetap
-- jalan sebelum migrasi ini dijalankan — hanya alamat LAN agent yang belum tampil. AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS relay_agent_local_info (
  relay_agent_id  text PRIMARY KEY REFERENCES relay_agents(id) ON DELETE CASCADE,
  local_info      text NOT NULL,
  updated_at      text NOT NULL
);

alter table public.relay_agent_local_info enable row level security;

COMMIT;
