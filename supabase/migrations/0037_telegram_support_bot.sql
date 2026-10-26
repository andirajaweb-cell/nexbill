-- Bot Telegram support 24 jam NEXBILL, 2026-10-26.
--  - telegram_support_links    : tautan akun Telegram ↔ staf + outlet (kode sekali pakai dari Chat Bantuan).
--  - telegram_support_messages : log percakapan bot (konteks AI, metrik "selesai di bot", tiket asal Telegram).
--  - support_kb_answers        : jawaban tim yang disimpan dari tiket selesai — sumber jawaban bot (kurasi mingguan).
-- Hanya tabel BARU — tidak mengubah tabel lama. Sebelum dijalankan: kartu Telegram di Chat Bantuan
-- menampilkan "belum aktif", webhook menolak pesan, dan bot
-- Customer Service menjawab tanpa jawaban tersimpan. AMAN DIJALANKAN ULANG.

BEGIN;

CREATE TABLE IF NOT EXISTS telegram_support_links (
  id                    text PRIMARY KEY,
  outlet_id             text NOT NULL REFERENCES outlets(id),
  staff_user_id         text NOT NULL REFERENCES staff_users(id),
  staff_name            text,
  chat_id               text,
  telegram_username     text,
  link_code             text,
  link_code_expires_at  text,
  linked_at             text,
  last_message_at       text,
  created_at            text NOT NULL,
  updated_at            text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_support_links_staff_outlet_idx ON telegram_support_links (staff_user_id, outlet_id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_support_links_chat_idx ON telegram_support_links (chat_id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_support_links_code_idx ON telegram_support_links (link_code);

CREATE TABLE IF NOT EXISTS telegram_support_messages (
  id                 text PRIMARY KEY,
  chat_id            text NOT NULL,
  outlet_id          text REFERENCES outlets(id),
  role               text NOT NULL,
  body               text NOT NULL,
  priority           text,
  resolution         text,
  support_thread_id  text REFERENCES support_threads(id),
  update_id          text,
  tg_message_id      text,
  created_at         text NOT NULL
);
CREATE INDEX IF NOT EXISTS telegram_support_messages_chat_idx ON telegram_support_messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS telegram_support_messages_thread_idx ON telegram_support_messages (support_thread_id);
CREATE UNIQUE INDEX IF NOT EXISTS telegram_support_messages_update_idx ON telegram_support_messages (update_id);

CREATE TABLE IF NOT EXISTS support_kb_answers (
  id                text PRIMARY KEY,
  question          text NOT NULL,
  answer            text NOT NULL,
  tags              text,
  source_thread_id  text REFERENCES support_threads(id),
  is_active         boolean NOT NULL DEFAULT true,
  created_by        text,
  created_at        text NOT NULL,
  updated_at        text NOT NULL
);

alter table public.support_kb_answers enable row level security;
alter table public.telegram_support_links enable row level security;
alter table public.telegram_support_messages enable row level security;

COMMIT;
