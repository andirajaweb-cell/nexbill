-- Permintaan hapus akun & data (Kebijakan Privasi bagian 9 + syarat Google Play), 2026-10-04.
-- Owner meminta dari Pengaturan → Akun Saya → Hapus Akun, konfirmasi dengan kode email; akun &
-- outlet langsung nonaktif, data pribadi dihapus/dianonimkan paling lambat 30 hari kemudian.
-- AMAN DIJALANKAN ULANG. Tabel internal NEXBILL: RLS aktif TANPA policy (sama seperti platform_leads).

BEGIN;

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id                          text PRIMARY KEY,
  requested_by_staff_user_id  text NOT NULL REFERENCES staff_users(id),
  email                       text NOT NULL,
  outlet_ids_json             text NOT NULL DEFAULT '[]',
  outlet_names                text,
  deactivated_staff_ids_json  text NOT NULL DEFAULT '[]',
  reason                      text,
  status                      text NOT NULL DEFAULT 'pending_verification', -- pending_verification | confirmed | purged | cancelled
  code_hash                   text,
  code_expires_at             text,
  attempts                    integer NOT NULL DEFAULT 0,
  confirmed_at                text,
  scheduled_purge_at          text,
  purged_at                   text,
  cancelled_at                text,
  handled_by                  text,
  created_at                  text NOT NULL,
  updated_at                  text NOT NULL
);
CREATE INDEX IF NOT EXISTS account_deletion_requests_status_idx ON account_deletion_requests (status, scheduled_purge_at);
CREATE INDEX IF NOT EXISTS account_deletion_requests_staff_idx ON account_deletion_requests (requested_by_staff_user_id);

alter table public.account_deletion_requests enable row level security;

COMMIT;
