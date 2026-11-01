# Support 24 jam lewat WhatsApp (bot WhatsApp NEXBILL)

Sejak 2026-11-01 bot WhatsApp NEXBILL (`scripts/whatsapp-bot.mts`, pm2 `whatsapp-bot` di VPS) punya dua tugas:

| Tugas | Siapa | Perilaku |
|---|---|---|
| **CRM** | Nomor lead di Platform Admin › Leads | Antrean pesan admin dikirim dengan jeda acak & batas harian; balasan lead dicatat di riwayat lead, **tidak dibalas otomatis** (tidak berubah). |
| **Support 24 jam** | Owner & kasir outlet NEXBILL | Sama dengan bot Telegram: FAQ (tanpa AI) → asisten AI (Claude Haiku) → tiket staf di Customer Service. Balasan tim diteruskan ke WhatsApp. |
| Nomor asing | Bukan staf, bukan lead | Sekali per 24 jam diberi tahu cara menautkan nomor. |

Bot tetap tidak membalas pelanggan outlet dan tidak mengirim notifikasi booking (keputusan 2026-09-29).

## Nomor dikenali dari mana

1. **Tautan kode** — dashboard › Customer Service › kartu **Support 24 jam di WhatsApp** › Hubungkan WhatsApp. WhatsApp terbuka dengan pesan `NEXBILL KODE ABC123` ke nomor bot; merchant menekan Kirim. Kode berlaku 15 menit, sekali pakai, sekaligus membuktikan nomor itu milik staf yang login. Satu staf = satu nomor; tautan lama staf itu dilepas.
2. **Nomor di Profil Outlet** — nomor WhatsApp = `outlets.phone` → dikenali sebagai **Owner** outlet itu, tanpa menautkan.

Satu nomor bisa dikenali di beberapa outlet; yang dipakai = outlet percakapan terakhir, lalu outlet tempat ia Owner. Ketik `OUTLET` untuk pindah.

## Cara pakai (merchant)

- Tulis pertanyaan seperti chat biasa.
- Setelah jawaban: balas **1** ✅ sudah terbantu · **2** ❌ belum terselesaikan (naik ke AI, lalu staf) · **3** 👤 bicara dengan tim.
- Kata perintah: `MENU` (topik bantuan, pilih dengan angka; `0` kembali), `STATUS` (akun & perangkat), `TIM`/`TEAM` (langsung ke staf), `GRUP` (grup Telegram komunitas), `BANTUAN`, `OUTLET`.
- Balas (Reply) pesan tim → masuk ke tiket yang sama.
- Hanya teks; foto/video lewat tiket di dashboard.

## Teknis (tanpa migrasi baru)

Semua di tabel `telegram_support_messages` (migrasi 0037):

| chat_id | Isi |
|---|---|
| `wa:<628…>` | Log percakapan (user/bot/team) — metrik, konteks AI, tiket asal WhatsApp. Baris `team` dengan `tg_message_id` kosong = balasan tim yang menunggu dikirim bot (diisi id pesan WhatsApp setelah terkirim). |
| `wa-link:<628…>` | Tautan nomor ↔ staf (body JSON `{staffUserId, staffName}`, outlet_id = outlet staf). |
| `wa-code:<KODE>` | Kode tautan sekali pakai (15 menit). |

Kode: `src/lib/whatsapp-support/` (`rules.ts` + tes, `text.ts` 6 bahasa, `service.ts`, `handler.ts`), API `src/app/api/whatsapp-support/link/route.ts`, kartu `src/app/dashboard/chat/whatsapp-support-card.tsx`, balasan tim `src/lib/telegram/forward.ts`, otak AI `src/lib/support-bot/brain.ts` (kanal `whatsapp`). Statistik: Platform Admin › Telegram Bot › "Support WhatsApp (30 hari)".

Status menu & penilaian disimpan di memori proses bot (basi 30 menit; hilang saat bot restart — merchant cukup mengetik `MENU` lagi).

## Environment (VPS, `.env` di `/opt/nexbill`)

| Nama | Keterangan |
|---|---|
| `WA_SUPPORT` | `off` mematikan support (bot kembali khusus CRM). Bawaan: aktif. |
| `ANTHROPIC_API_KEY` | Tingkat 2 (AI). Tanpa key: FAQ lalu langsung ke staf. |
| `TELEGRAM_ONCALL_CHAT_IDS` | Petugas jaga diberi tahu untuk P1/P2 (lewat Telegram), sama dengan bot Telegram. |
| `NEXT_PUBLIC_DASHBOARD_URL` | Tautan dashboard di pesan bot. |

## Deploy

1. `git push`, lalu di VPS: `cd /opt/nexbill && git pull && npm install && pm2 restart whatsapp-bot --update-env`.
2. Pastikan bot **Online** di Platform Admin › WhatsApp Bot (nomor bot dipakai kartu dashboard & tautan wa.me).
3. Tes: dashboard › Customer Service › Support 24 jam di WhatsApp › Hubungkan WhatsApp → kirim kode → bot membalas "Terhubung ke …" dan menu.
