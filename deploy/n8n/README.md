# Chatbot WhatsApp NEXBILL dengan n8n (self-host, tanpa cloud)

n8n jadi **"otak"** bot WhatsApp NEXBILL. Bot WhatsApp yang sudah ada (pm2, `npm run bot:whatsapp`)
tetap menerima dan mengirim pesan, membuat lead di CRM, dan menjaga aturan keamanan. n8n hanya
memutuskan **apa yang dibalas**, dan alurnya bisa Anda ubah sendiri di editor visual n8n tanpa
coding dan tanpa deploy ulang.

```
Prospek chat ke WA NEXBILL
        │
        ▼
Bot WhatsApp (pm2, VPS) ──► buat/catat lead, cek "admin sedang menangani", #bot-off, STOP
        │  POST http://127.0.0.1:5678/webhook/nexbill-wa   (header X-Nexbill-Secret)
        ▼
n8n (Docker, VPS yang sama, hanya 127.0.0.1)
   Atur alur (menu & FAQ) ──► jawaban tetap ─────────────┐
            └─► Tanya Claude ─► Olah jawaban AI ─────────┤
                                                         ▼
                                              Balas ke bot NEXBILL
        │
        ▼
Bot mengirim balasan, mengisi data lead (outlet, kota, jumlah unit, …), mengabari admin bila prospek panas
```

**Yang tetap dipegang bot, bukan n8n:**

- Staf outlet yang nomornya tertaut tetap dilayani Support 24 jam bawaan.
- Lead Google Maps/manual tidak dibalas otomatis.
- Balasan STOP / "tidak tertarik" diproses bot sendiri.
- Bot diam 24 jam setelah admin membalas.

**Pengaman:** kalau n8n mati, lambat (lebih dari 15 detik), atau membalas dengan format salah, bot
otomatis memakai otak bawaannya. Prospek tetap dibalas.

**Tanpa cloud:**

- n8n jalan di VPS Anda sendiri. Port hanya dibuka ke `127.0.0.1`, jadi tidak bisa diakses dari internet.
- Workflow, kredensial, dan riwayat eksekusi tersimpan di VPS (volume Docker `n8n_data`).
- Telemetri, cek versi, dan galeri template n8n dimatikan.
- Satu-satunya layanan luar adalah API Claude (Anthropic) untuk jawaban AI, sama seperti bot sekarang.

---

## 1. Pasang n8n di VPS (sekali)

Butuh Docker. Kalau `docker --version` belum ada, pasang dulu: `curl -fsSL https://get.docker.com | sh`.

```bash
cd /opt/nexbill && git pull                # ambil folder deploy/n8n
cd deploy/n8n
cp .env.example .env
echo "N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)" > .env
docker compose up -d
docker compose logs -f n8n                 # tunggu "Editor is now accessible", lalu Ctrl+C
```

> Simpan isi `.env` di tempat aman. Kalau `N8N_ENCRYPTION_KEY` hilang atau diganti, kredensial di n8n
> tidak bisa dibuka lagi.

## 2. Buka editor n8n dari PC

Port n8n tidak dibuka ke internet, jadi buka lewat SSH tunnel. Di PowerShell PC:

```powershell
ssh -L 5678:127.0.0.1:5678 root@IP-VPS-ANDA
```

Biarkan jendela itu terbuka, lalu buka **http://localhost:5678** di browser. Pertama kali, n8n meminta
Anda membuat akun pemilik. Akun ini lokal di VPS Anda, bukan akun cloud.

## 3. Impor workflow

1. Di n8n: **Create workflow** → menu **⋯** (kanan atas) → **Import from File**.
2. Pilih `deploy/n8n/workflows/nexbill-wa-chatbot.json` (salin dulu dari repo ke PC).
3. Buat 2 kredensial jenis **Header Auth**:

   | Node | Name | Value |
   |---|---|---|
   | **Pesan WhatsApp masuk** → Credential for Header Auth → *Create new* | `X-Nexbill-Secret` | rahasia acak buatan Anda, mis. hasil `openssl rand -hex 24` |
   | **Tanya Claude** → Credential for Header Auth → *Create new* | `x-api-key` | API key Anthropic (sama dengan `ANTHROPIC_API_KEY` di .env NEXBILL) |

4. Klik **Save**, lalu geser tombol **Active** ke ON.

## 4. Sambungkan bot WhatsApp ke n8n

Tambahkan ke `/opt/nexbill/.env`, yaitu file yang dibaca bot:

```
N8N_WEBHOOK_URL=http://127.0.0.1:5678/webhook/nexbill-wa
N8N_WEBHOOK_SECRET=<rahasia yang sama dengan kredensial X-Nexbill-Secret di langkah 3>
# opsional: N8N_TIMEOUT_MS=15000
```

Restart bot: `pm2 restart <nama-proses-bot-whatsapp>`. Di log (`pm2 logs`) muncul:
`Bot marketing: aktif (otak: n8n, cadangan bawaan)`.

Untuk berhenti memakai n8n: hapus atau kosongkan `N8N_WEBHOOK_URL`, lalu restart bot. Bot kembali
memakai otak bawaan.

## 5. Uji

Kirim chat dari nomor lain (bukan nomor admin/staf) ke WhatsApp NEXBILL:

- `halo` → sambutan + menu angka. Balas `1` (harga), `2` (fitur), `3` (trial), `4` (admin), `5` (sudah pelanggan).
- `bisa dipakai di iPhone?` → jawaban FAQ tanpa AI.
- `harga untuk 8 unit berapa?` → jawaban Claude dengan harga live dari paket NEXBILL.

Di n8n, menu **Executions** menampilkan setiap pesan: apa yang masuk dan apa yang dibalas.
Di **Platform Admin → Leads**, prospek muncul sebagai "Chat WA masuk" dengan riwayat percakapan.

---

## Mengubah alur tanpa coding

Buka node **Atur alur (menu & FAQ)**. Di bagian **PENGATURAN** paling atas:

- `FAQ`: tambah pasangan `kata` → `jawab`. Pesan yang mengandung kata kunci langsung dijawab, cepat
  dan tanpa biaya AI. Tulis hanya fakta yang benar dan bisa dibuktikan, dan jangan menyebut pesaing.
- `INSTRUKSI_TAMBAHAN_AI`: arahan tambahan untuk AI, mis. promo yang **sedang** berlaku atau gaya bahasa.
- Teks sambutan, harga, fitur, trial, dan handoff datang dari NEXBILL (`templates`) dalam bahasa prospek.
  Harga selalu mengikuti Platform Admin → Paket. Kalau mau mengganti teks, tulis teks Anda sendiri
  di `jawab = { reply: "…" }`.

Ide alur lain yang bisa ditambahkan di n8n tanpa mengubah NEXBILL:

- Kirim notifikasi ke Telegram/email saat `intent` = subscribe.
- Simpan percakapan ke Google Sheets.
- Jawab berbeda di luar jam kerja.

## Kontrak data (untuk yang mengubah workflow lebih jauh)

**Yang dikirim bot ke n8n (body):**

- `message`: `{ text, mediaOnly, lang, isGreeting, menuChoice }`.
  - `menuChoice` bernilai `price | features | trial | human | customer | null`.
  - `menuChoice` hanya terisi kalau menu baru saja ditampilkan, jadi angka "5" sebagai jumlah unit tidak salah baca.
- `contact`: `{ phone, localPhone, pushName }`.
- `lead`: `{ id, isNew, name, status, temperature, city, unitCount, currentBilling, contactName, adminUrl }`.
- `history`: percakapan terakhir dalam format `messages` Claude.
- `facts`: harga live + tautan.
- `templates`: teks siap pakai dalam bahasa prospek.
- `ai`: `{ systemPrompt, model, outputFormat }`.

**Yang harus dibalas n8n (JSON):**

```json
{ "reply": "teks balasan atau null", "intent": "subscribe|demo|question|human|support|stop|other",
  "handoff": false, "menu": false,
  "extracted": { "outletName": null, "city": null, "unitCount": null, "currentBilling": null, "contactName": null } }
```

Arti nilainya:

| Nilai | Yang dilakukan bot |
|---|---|
| `reply: null` | Bot diam |
| `intent: "support"` | Kirim cara menautkan akun Support 24 jam |
| `intent: "stop"` | Lead diubah ke Tidak Tertarik + pesan pamit |
| `handoff: true`, atau intent `subscribe` / `demo` / `human` | Admin dikabari lewat Telegram petugas jaga |
| `menu: true` | Balasan angka berikutnya dibaca sebagai pilihan menu |
| `extracted` | Hanya mengisi kolom lead yang masih kosong |

Kalau respons kosong atau rusak, bot memakai otak bawaan.

Kode bot: `src/lib/leads/n8n-bridge.ts`, `n8n-bridge-rules.ts` (ada tes), `wa-marketing.ts`.

## Tanpa Docker (alternatif)

```bash
npm install -g n8n
N8N_ENCRYPTION_KEY=... N8N_SECURE_COOKIE=false N8N_DIAGNOSTICS_ENABLED=false N8N_TEMPLATES_ENABLED=false \
  GENERIC_TIMEZONE=Asia/Jakarta N8N_LISTEN_ADDRESS=127.0.0.1 pm2 start n8n --name n8n && pm2 save
```

## Perawatan

- Update n8n: `cd /opt/nexbill/deploy/n8n && docker compose pull && docker compose up -d`.
- Backup: `docker run --rm -v n8n_n8n_data:/d -v $PWD:/b alpine tar czf /b/n8n-backup.tgz -C /d .`
  Nama volume bisa dicek dengan `docker volume ls`.
- Ekspor workflow setelah diubah (⋯ → Download), lalu simpan ke `deploy/n8n/workflows/` supaya tercatat di Git.
