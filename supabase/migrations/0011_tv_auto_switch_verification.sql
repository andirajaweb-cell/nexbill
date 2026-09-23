-- NexbillAgent v1.2 — tahap 2 (2026-09-23). Rancangan: AGENT-V1.2-DESIGN.md bagian 5.
--
-- JALANKAN SEBELUM deploy ke Vercel (butuh 0009 dan 0010 sudah dijalankan).
--
--   tv_screens.auto_switch_verified_at — kapan staf mengonfirmasi, dengan mata sendiri di depan
--     TV, bahwa screensaver terbuka dan TV pindah ke HDMI PlayStation. Otomatisasi per layar tidak
--     bisa dinyalakan selama kolom ini kosong.
--
--   tv_screens.tv_info — hasil terakhir tombol "Deteksi TV" (merek, model, versi Android, daftar
--     browser terpasang), sebagai JSON.
--
-- AMAN DIJALANKAN ULANG: ADD COLUMN IF NOT EXISTS, tidak ada data yang diubah.

BEGIN;

ALTER TABLE tv_screens ADD COLUMN IF NOT EXISTS auto_switch_verified_at text;
ALTER TABLE tv_screens ADD COLUMN IF NOT EXISTS tv_info                 text;

COMMIT;

-- VERIFIKASI (seharusnya dua baris):
--
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'tv_screens' AND column_name IN ('auto_switch_verified_at','tv_info');
