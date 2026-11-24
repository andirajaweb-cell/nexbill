-- Riwayat percakapan AI (chatbot n8n + Claude), 2026-11-23.
--  - ai_conversations : satu sesi percakapan per nomor/pengunjung, bisa ditautkan ke lead CRM.
--  - ai_messages      : setiap pesan masuk (user) dan keluar (assistant) beserta agent yang menjawab.
--
-- Hanya tabel BARU. Bot WhatsApp (Baileys) tetap mencatat lead di platform_leads seperti biasa;
-- tabel ini menyimpan konteks percakapan AI untuk n8n dan audit balasan.
-- Tipe kolom mengikuti konvensi proyek: id text, waktu text (ISO 8601).
-- JALANKAN MANUAL di Supabase SQL Editor. AMAN DIJALANKAN ULANG (IF NOT EXISTS).

BEGIN;

CREATE TABLE IF NOT EXISTS ai_conversations (
  id              text PRIMARY KEY,
  channel         text NOT NULL DEFAULT 'whatsapp',      -- whatsapp | website
  visitor_id      text,                                  -- id pengunjung website (kosong untuk WA)
  phone           text,                                  -- 628xxx untuk WhatsApp
  lead_id         text REFERENCES platform_leads(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'active',        -- active | human | closed
  assigned_agent  text,                                  -- sales | support | orchestrator
  created_at      text NOT NULL,
  updated_at      text NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_conversations_phone_idx ON ai_conversations (phone, created_at);
CREATE INDEX IF NOT EXISTS ai_conversations_lead_idx ON ai_conversations (lead_id);
CREATE INDEX IF NOT EXISTS ai_conversations_status_idx ON ai_conversations (status, updated_at);

CREATE TABLE IF NOT EXISTS ai_messages (
  id               text PRIMARY KEY,
  conversation_id  text NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role             text NOT NULL,                        -- user | assistant | system
  content          text NOT NULL,
  agent_name       text,                                 -- agent yang menjawab (untuk role assistant)
  intent           text,                                 -- hasil klasifikasi: sales | support | stop | other
  created_at       text NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_messages_conversation_idx ON ai_messages (conversation_id, created_at);

-- Data internal NEXBILL: RLS aktif TANPA policy (sama seperti platform_leads di 0014 dan 0026).
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages FORCE ROW LEVEL SECURITY;

COMMIT;
