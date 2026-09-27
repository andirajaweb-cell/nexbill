-- Satu akun = satu perangkat/browser aktif (keamanan login), 2026-09-27.
--
-- staff_users.active_session_*: sesi yang sedang berlaku untuk akun itu. Login dari browser/PC lain
-- ditolak selama sesi ini masih aktif (ada aktivitas dalam 30 menit terakhir). Logout, 30 menit
-- tanpa aktivitas, atau Owner menekan "Keluarkan" di Staf & Hak Akses membebaskannya.
-- outlets.single_device_login: aturan bisa dimatikan per outlet (default AKTIF).
--
-- JALANKAN SEBELUM deploy ke Vercel — setiap request membaca kolom ini.
-- AMAN DIJALANKAN ULANG. Sesi yang sedang login tetap berlaku sampai akun itu login ulang.

ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS active_session_id text;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS active_session_at text;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS active_session_device text;
ALTER TABLE staff_users ADD COLUMN IF NOT EXISTS active_session_ip text;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS single_device_login boolean NOT NULL DEFAULT true;

-- VERIFIKASI (harus 5 baris):
-- SELECT table_name, column_name FROM information_schema.columns
-- WHERE (table_name = 'staff_users' AND column_name LIKE 'active_session%') OR (table_name = 'outlets' AND column_name = 'single_device_login');
