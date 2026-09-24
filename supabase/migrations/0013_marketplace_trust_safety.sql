-- Marketplace Antar-Outlet — keamanan sesama outlet (profil kepercayaan, rekening penerima,
-- bukti transaksi, rating, aduan & sengketa), 2026-09-24.
--
-- JALANKAN SEBELUM deploy ke Vercel, SETELAH 0012. Kolom baru di marketplace_deals dibaca lewat
-- db.select() biasa — tanpa migrasi ini tab Kesepakatan gagal dimuat.
--
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS di semua perintah. Tidak ada data lama yang diubah.

BEGIN;

-- 1. Pengaturan & status keamanan Marketplace per outlet (satu baris per outlet, dibuat saat
--    pertama kali dibutuhkan).
CREATE TABLE IF NOT EXISTS marketplace_outlet_trust (
  outlet_id            text PRIMARY KEY REFERENCES outlets(id),
  -- Rekening penerima pembayaran Marketplace. Pembeli HANYA diarahkan ke rekening ini.
  bank_name            text,
  bank_account_number  text,
  bank_account_holder  text,
  bank_updated_at      text,
  -- Penangguhan akses Marketplace oleh platform-admin.
  suspended            boolean NOT NULL DEFAULT false,
  suspended_reason     text,
  suspended_at         text,
  suspended_by         text,
  -- Jumlah peringatan resmi dari keputusan sengketa.
  warning_count        integer NOT NULL DEFAULT 0,
  created_at           text NOT NULL,
  updated_at           text NOT NULL
);

-- 2. Bukti transaksi + salinan rekening pada kesepakatan.
ALTER TABLE marketplace_deals ADD COLUMN IF NOT EXISTS payout_snapshot           text; -- JSON rekening penjual saat penawaran diterima
ALTER TABLE marketplace_deals ADD COLUMN IF NOT EXISTS buyer_payment_proof_url   text;
ALTER TABLE marketplace_deals ADD COLUMN IF NOT EXISTS buyer_payment_proof_at    text;
ALTER TABLE marketplace_deals ADD COLUMN IF NOT EXISTS seller_handover_proof_url text;
ALTER TABLE marketplace_deals ADD COLUMN IF NOT EXISTS seller_handover_proof_at  text;

-- 3. Rating & ulasan — satu per pihak per kesepakatan selesai.
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id                  text PRIMARY KEY,
  deal_id             text NOT NULL REFERENCES marketplace_deals(id),
  reviewer_outlet_id  text NOT NULL REFERENCES outlets(id),
  reviewee_outlet_id  text NOT NULL REFERENCES outlets(id),
  rating              integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             text,
  created_at          text NOT NULL,
  updated_at          text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS marketplace_reviews_deal_reviewer_idx ON marketplace_reviews (deal_id, reviewer_outlet_id);
CREATE INDEX IF NOT EXISTS marketplace_reviews_reviewee_idx ON marketplace_reviews (reviewee_outlet_id);

-- 4. Aduan & sengketa — diputuskan manual oleh platform-admin.
CREATE TABLE IF NOT EXISTS marketplace_disputes (
  id                        text PRIMARY KEY,
  deal_id                   text NOT NULL REFERENCES marketplace_deals(id),
  reporter_outlet_id        text NOT NULL REFERENCES outlets(id),
  reported_outlet_id        text NOT NULL REFERENCES outlets(id),
  category                  text NOT NULL,
  description               text NOT NULL,
  evidence_urls             text,          -- JSON array
  respondent_statement      text,
  respondent_evidence_urls  text,          -- JSON array
  respondent_at             text,
  status                    text NOT NULL DEFAULT 'open',   -- open | resolved
  resolution                text,                           -- dismissed | warning | suspended
  admin_note                text,
  resolved_by               text,
  resolved_at               text,
  created_at                text NOT NULL,
  updated_at                text NOT NULL
);
CREATE INDEX IF NOT EXISTS marketplace_disputes_status_idx   ON marketplace_disputes (status);
CREATE INDEX IF NOT EXISTS marketplace_disputes_reported_idx ON marketplace_disputes (reported_outlet_id);
CREATE INDEX IF NOT EXISTS marketplace_disputes_deal_idx     ON marketplace_disputes (deal_id);

COMMIT;

-- ============ RLS: TUTUP akses langsung lewat API Supabase ============
-- Tabel-tabel ini memuat No. HP, nomor rekening, dan bukti transfer. Aplikasi mengaksesnya hanya
-- lewat server (Drizzle, terhubung sebagai PEMILIK tabel — lihat 0003_tenant_role.sql), dan pemilik
-- tabel melewati RLS selama TIDAK di-FORCE. Jadi menyalakan RLS TANPA kebijakan apa pun:
--   * tidak mengubah perilaku aplikasi sama sekali, dan
--   * menolak semua akses lewat anon/authenticated key Supabase (REST/PostgREST).
-- marketplace_listings & marketplace_deals (dari 0008) ikut ditutup: sebelumnya contact_phone dan
-- buyer_contact_phone bisa terbaca siapa pun yang memegang anon key.
--
-- CATATAN untuk saat DATABASE_URL kelak dipindah ke role nexbill_app_tenant (0003): role itu bukan
-- pemilik, jadi kelima tabel ini butuh kebijakan eksplisit lebih dulu — kalau tidak, Marketplace
-- kosong untuk semua outlet.
alter table public.marketplace_outlet_trust enable row level security;
alter table public.marketplace_reviews      enable row level security;
alter table public.marketplace_disputes     enable row level security;
alter table public.marketplace_listings     enable row level security;
alter table public.marketplace_deals        enable row level security;
--
-- VERIFIKASI (seharusnya tiga baris):
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('marketplace_outlet_trust','marketplace_reviews','marketplace_disputes');
