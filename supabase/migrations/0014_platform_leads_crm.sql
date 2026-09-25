-- Leads & CRM platform-admin — prospek calon pelanggan NEXBILL dari Google Maps (Places API) atau
-- input manual, beserta riwayat aktivitas follow-up, 2026-09-25.
--
-- JALANKAN SEBELUM deploy ke Vercel, SETELAH 0013. Halaman /platform-admin/leads membaca kedua
-- tabel ini — tanpa migrasi ini halaman gagal dimuat.
--
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS di semua perintah. Tidak ada data lama yang diubah.

BEGIN;

CREATE TABLE IF NOT EXISTS platform_leads (
  id                   text PRIMARY KEY,
  place_id             text,                       -- Google Place ID; NULL untuk lead manual
  source               text NOT NULL DEFAULT 'manual',
  search_query         text,
  name                 text NOT NULL,
  category             text,
  address              text,
  city                 text,
  phone                text,
  wa_number            text,                       -- format 628xxx untuk wa.me
  website              text,
  maps_url             text,
  lat                  double precision,
  lng                  double precision,
  rating               double precision,
  review_count         integer,
  business_status      text,
  contact_name         text,
  status               text NOT NULL DEFAULT 'baru',
  next_follow_up_date  text,                       -- YYYY-MM-DD
  last_contacted_at    text,
  notes                text,
  converted_outlet_id  text REFERENCES outlets(id),
  created_by           text REFERENCES platform_admins(id),
  created_at           text NOT NULL,
  updated_at           text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS platform_leads_place_id_idx ON platform_leads (place_id);
CREATE INDEX IF NOT EXISTS platform_leads_status_idx ON platform_leads (status);
CREATE INDEX IF NOT EXISTS platform_leads_follow_up_idx ON platform_leads (next_follow_up_date);

CREATE TABLE IF NOT EXISTS platform_lead_activities (
  id               text PRIMARY KEY,
  lead_id          text NOT NULL REFERENCES platform_leads(id) ON DELETE CASCADE,
  type             text NOT NULL,
  content          text NOT NULL,
  created_by       text REFERENCES platform_admins(id),
  created_by_name  text,
  created_at       text NOT NULL
);
CREATE INDEX IF NOT EXISTS platform_lead_activities_lead_idx ON platform_lead_activities (lead_id);

-- Data internal NEXBILL (sama seperti platform_costs/platform_purchases): RLS aktif TANPA policy,
-- jadi terkunci untuk role tenant. Hanya rute /api/platform-admin/** yang boleh membacanya.
ALTER TABLE public.platform_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_leads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platform_lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_lead_activities FORCE ROW LEVEL SECURITY;

COMMIT;
