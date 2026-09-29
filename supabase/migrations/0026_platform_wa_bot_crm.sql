-- Bot WhatsApp NEXBILL KHUSUS CRM platform-admin, 2026-09-29.
--  - platform_wa_bot_status : status koneksi, QR login, heartbeat bot (scripts/whatsapp-bot.mts).
--                             Menggantikan file lokal data/whatsapp-status.json yang tidak bisa
--                             dibaca web app di Vercel.
--  - platform_wa_outbox     : antrean pesan ke lead yang dikirim bot dari nomor NEXBILL.
--  - platform_leads         : penanda balasan WhatsApp masuk dari lead.
--
-- JALANKAN SEBELUM deploy ke Vercel, SETELAH 0025. Tanpa migrasi ini halaman
-- /platform-admin/whatsapp-bot dan tombol "Kirim via Bot" gagal; kolom baru platform_leads juga
-- dibaca daftar CRM (select() membaca semua kolom schema) — halaman Leads ikut gagal tanpa ini.
--
-- AMAN DIJALANKAN ULANG: IF NOT EXISTS di semua perintah. Tidak ada data lama yang diubah.

BEGIN;

CREATE TABLE IF NOT EXISTS platform_wa_bot_status (
  id                 text PRIMARY KEY,             -- selalu 'main' (satu bot)
  connected          boolean NOT NULL DEFAULT false,
  number             text,                         -- JID nomor bot saat terhubung
  qr_data_url        text,                         -- QR login (data:image/png) saat menunggu scan
  last_heartbeat_at  text,
  last_error         text,
  updated_at         text NOT NULL
);

CREATE TABLE IF NOT EXISTS platform_wa_outbox (
  id               text PRIMARY KEY,
  lead_id          text NOT NULL REFERENCES platform_leads(id) ON DELETE CASCADE,
  phone            text NOT NULL,                  -- 628xxx
  body             text NOT NULL,
  template_id      text REFERENCES platform_wa_templates(id) ON DELETE SET NULL,
  template_title   text,                           -- salinan judul saat dikirim
  status           text NOT NULL DEFAULT 'pending', -- pending | sending | sent | failed
  error            text,
  attempts         integer NOT NULL DEFAULT 0,
  created_by       text REFERENCES platform_admins(id),
  created_by_name  text,
  created_at       text NOT NULL,
  sent_at          text
);
CREATE INDEX IF NOT EXISTS platform_wa_outbox_status_idx ON platform_wa_outbox (status, created_at);
CREATE INDEX IF NOT EXISTS platform_wa_outbox_lead_idx ON platform_wa_outbox (lead_id);

ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS last_inbound_at text;
ALTER TABLE platform_leads ADD COLUMN IF NOT EXISTS inbound_unread boolean NOT NULL DEFAULT false;

-- Data internal NEXBILL: RLS aktif TANPA policy (sama seperti platform_leads di 0014).
ALTER TABLE public.platform_wa_bot_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_wa_bot_status FORCE ROW LEVEL SECURITY;
ALTER TABLE public.platform_wa_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_wa_outbox FORCE ROW LEVEL SECURITY;

COMMIT;
