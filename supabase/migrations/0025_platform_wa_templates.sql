-- Template pesan WhatsApp per tahap pipeline CRM (platform-admin /platform-admin/leads), 2026-09-29.
-- Tiap template punya tahap (status lead atau 'umum') dan unsur pesan (masalah, solusi, kemudahan,
-- kelengkapan, dll). Bisa ditambah/diedit/dihapus dari tab "Template WA".
--
-- JALANKAN SEBELUM deploy ke Vercel, SETELAH 0024. Tanpa tabel ini tab Template WA dan pemilih
-- template di detail lead gagal dimuat (halaman CRM lainnya tetap jalan).
--
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS. Template bawaan TIDAK diisi di sini — tekan tombol
-- "Tambahkan template bawaan" di tab Template WA (isi teksnya ada di src/lib/leads/wa-template.ts).

BEGIN;

CREATE TABLE IF NOT EXISTS platform_wa_templates (
  id            text PRIMARY KEY,
  stage         text NOT NULL,                 -- status lead (baru, dihubungi, ...) atau 'umum'
  element       text NOT NULL,                 -- unsur: pembuka, masalah, solusi, kemudahan, ...
  title         text NOT NULL,
  body          text NOT NULL,
  sort_order    integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  usage_count   integer NOT NULL DEFAULT 0,
  last_used_at  text,
  created_by    text REFERENCES platform_admins(id),
  created_at    text NOT NULL,
  updated_at    text NOT NULL
);
CREATE INDEX IF NOT EXISTS platform_wa_templates_stage_idx ON platform_wa_templates (stage, sort_order);

-- Data internal NEXBILL: RLS aktif TANPA policy (sama seperti platform_leads di 0014).
ALTER TABLE public.platform_wa_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_wa_templates FORCE ROW LEVEL SECURITY;

COMMIT;
