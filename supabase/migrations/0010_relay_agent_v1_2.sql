-- NexbillAgent v1.2 — tahap 1 (2026-09-23). Rancangan lengkap: AGENT-V1.2-DESIGN.md di root folder proyek.
--
-- JALANKAN SEBELUM men-deploy kode apa pun dari commit yang sama — baik ke VPS (Relay Hub)
-- maupun ke Vercel. Kolom-kolom di bawah sudah tercantum di src/db/schema.ts, dan Drizzle
-- menyebut SEMUA kolom skema di setiap `db.select().from(tabel)` tanpa daftar kolom. Kalau kode
-- baru jalan lebih dulu, query semacam itu gagal dengan "column ... does not exist".
--
-- Jalur yang paling penting sudah diamankan dari urutan yang salah (autentikasi di relay-hub.ts
-- dan pengiriman perintah TV di adapters/android-tv-relay.ts memilih kolom secara eksplisit),
-- jadi menyalakan/mematikan TV tetap jalan. Tapi halaman daftar Relay Agent di dashboard dan
-- platform-admin, serta seluruh fitur TV Screensaver, BUTUH migrasi ini.
--
-- Juga butuh 0009_tv_screensaver.sql sudah dijalankan lebih dulu (tabel tv_screens dibuat di sana).
--
-- Seluruhnya ADD COLUMN IF NOT EXISTS — aman dijalankan ulang, dan tidak mengubah data yang ada.

BEGIN;

-- ============ relay_agents: versi & kemampuan yang dilaporkan agent ============
-- Diisi relay-hub.ts setiap kali agent terhubung. NULL = agent v1.1 (tidak melaporkan apa pun)
-- atau belum pernah terhubung sejak kolom ini ada — keduanya dibaca sebagai v1.1 dengan kemampuan
-- ["power"] saja (lihat parseStoredCapabilities di src/lib/relay/capabilities.ts).
ALTER TABLE relay_agents ADD COLUMN IF NOT EXISTS agent_version  text;
ALTER TABLE relay_agents ADD COLUMN IF NOT EXISTS capabilities   text;   -- array JSON, mis. ["power","open_screensaver"]
-- "beta" hanya untuk outlet uji (XTREAM ps). Semua agent yang sudah ada otomatis "stable".
ALTER TABLE relay_agents ADD COLUMN IF NOT EXISTS update_channel text NOT NULL DEFAULT 'stable';

-- ============ tv_screens: otomatisasi per layar (dipakai mulai tahap 2) ============
-- DEFAULT false: tidak ada layar yang otomatis pindah input sampai merchant menyalakannya sendiri
-- setelah tombol Tes lulus di TV tersebut.
ALTER TABLE tv_screens ADD COLUMN IF NOT EXISTS auto_switch_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE tv_screens ADD COLUMN IF NOT EXISTS hdmi_port           integer;
ALTER TABLE tv_screens ADD COLUMN IF NOT EXISTS browser_package     text;

-- Batasi nilai di tingkat database juga, bukan hanya di kode — hdmi_port dan update_channel
-- akhirnya menentukan perintah yang dikirim ke TV di outlet. DO-block supaya aman diulang
-- (ADD CONSTRAINT tidak punya IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tv_screens_hdmi_port_range') THEN
    ALTER TABLE tv_screens ADD CONSTRAINT tv_screens_hdmi_port_range CHECK (hdmi_port IS NULL OR hdmi_port BETWEEN 1 AND 4);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'relay_agents_update_channel_valid') THEN
    ALTER TABLE relay_agents ADD CONSTRAINT relay_agents_update_channel_valid CHECK (update_channel IN ('stable', 'beta'));
  END IF;
END $$;

COMMIT;

-- VERIFIKASI (jalankan terpisah; seharusnya menampilkan enam baris):
--
--   SELECT table_name, column_name FROM information_schema.columns
--   WHERE (table_name = 'relay_agents' AND column_name IN ('agent_version','capabilities','update_channel'))
--      OR (table_name = 'tv_screens'   AND column_name IN ('auto_switch_enabled','hdmi_port','browser_package'))
--   ORDER BY table_name, column_name;
--
-- SETELAH Relay Hub baru di-restart di VPS, versi setiap agent yang terhubung terlihat di sini:
--
--   SELECT name, status, agent_version, capabilities, update_channel, last_seen_at FROM relay_agents;
--
-- Agent yang sudah terpasang sekarang (v1.1) akan tercatat agent_version = '1.1', capabilities = '["power"]'.
