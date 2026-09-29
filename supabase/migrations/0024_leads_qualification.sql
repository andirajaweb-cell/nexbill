-- Leads & CRM: kolom kualifikasi prospek (prioritas A/B/C, suhu HOT/WARM/COLD, area/klaster,
-- billing yang dipakai sekarang, jumlah unit, pain point, angle akuisisi, next action), 2026-09-29.
--
-- JALANKAN SEBELUM deploy ke Vercel, SETELAH 0014 dan 0023. Halaman /platform-admin/leads membaca
-- kolom-kolom ini — tanpa migrasi ini halaman gagal dimuat.
--
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS di semua perintah. Tidak ada data lama yang diubah; semua
-- kolom baru nullable (NULL = "belum diketahui").

BEGIN;

ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS priority          text;   -- 'A' | 'B' | 'C'
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS temperature       text;   -- 'hot' | 'warm' | 'cold'
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS area              text;   -- klaster kunjungan, mis. 'Majalaya/Solokanjeruk'
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS current_billing   text;   -- sistem billing yang dipakai sekarang
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS unit_count        integer;
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS pain_points       text;
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS acquisition_angle text;
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS next_action       text;

CREATE INDEX IF NOT EXISTS platform_leads_priority_idx ON platform_leads (priority);
CREATE INDEX IF NOT EXISTS platform_leads_area_idx ON platform_leads (area);

COMMIT;

-- VERIFIKASI (harus 8 baris):
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'platform_leads'
--   AND column_name IN ('priority','temperature','area','current_billing','unit_count','pain_points','acquisition_angle','next_action');
