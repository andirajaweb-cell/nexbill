# POS Rental PS — Agentic AI System & ERP

Aplikasi POS & ERP rental PlayStation + warnet/WiFi + F&B, dibangun bertahap dalam 2 fase:

**Fase 0 (fondasi)**:
- **Kontrol TV/konsol via WiFi** (nyala otomatis saat sesi rental dimulai, mati saat selesai) — default pakai smart plug Tasmota via MQTT, bisa juga HTTP generik / Tuya / eWeLink.
- **Pembayaran**: Cash, QRIS, Fastpay H2H, DANA, GoPay, BukuPay, Transfer, Kartu.
- **AI agent (Claude)** yang membalas otomatis chat **WhatsApp** dan **DM Instagram**.

**Fase 1 (ERP lengkap — sudah selesai)**:
- **Dashboard Owner / Control Center** (`/dashboard`) — omzet, laba kotor, estimasi laba bersih, kas masuk/keluar, status semua unit PS (tersedia/terpakai/booking/maintenance), tingkat utilisasi, pendapatan per unit, produk terlaris, jam ramai, pelanggan aktif, stok menipis, piutang & hutang. Auto-refresh tiap 30 detik.
- **Rental Management** (`/dashboard/rental`, `/dashboard/booking`) — pricing dinamis (per hari/jam/happy hour/weekend), diskon member, mulai/jeda/lanjut/perpanjang sesi, overtime otomatis, pembulatan durasi, booking dengan deteksi bentrok jadwal + waiting list otomatis, reschedule, no-show, check-in.
- **Kasir (POS)** (`/dashboard/pos`) — keranjang, diskon, voucher, pajak, service charge, split bill, merge bill, cash/QRIS/e-wallet/transfer/kartu, struk digital (`/receipt/[id]`).
- **Membership & CRM** (`/dashboard/membership`) — profil pelanggan, riwayat, total belanja, tier Regular/Silver/Gold/Platinum otomatis naik, poin loyalti, voucher & promo.
- **Inventori F&B** (`/dashboard/inventory`) — produk, supplier, purchase order → penerimaan barang → invoice pembelian → pembayaran (AP), retur pembelian, stock opname, resep/BOM yang otomatis memotong stok bahan baku dan menghitung HPP setiap penjualan.
- **Accounting** (`/dashboard/accounting`) — Chart of Accounts, jurnal umum (debit/kredit otomatis dari setiap transaksi rental/POS/pembelian/beban), neraca saldo, laba rugi, neraca, **arus kas**, pencatatan beban. Semua bertumpu pada mesin double-entry di `src/lib/accounting/`.
- **Shift & Kasir** (`/dashboard/shift`) — buka/tutup shift dengan modal awal, rekonsiliasi kas fisik vs ekspektasi otomatis, selisih terdeteksi.
- **Staf & Hak Akses (RBAC)** (`/dashboard/staff`) — CRUD staf, 6 role (Owner/Manager/Kasir/Akuntan/Dapur/Supervisor), void/refund order butuh approval owner/manager (kecuali role yang diizinkan void langsung), jejak audit log lengkap.
- **Laporan & Analitik** (`/dashboard/reports`) — laporan Penjualan, Rental (per unit), Inventori & HPP (margin per produk), Pelanggan (top spender, distribusi tier) — semua dengan filter rentang tanggal.

Dibangun dengan Next.js 16 (App Router) + TypeScript + Tailwind + Drizzle ORM (SQLite).

> **Catatan penting**: sistem hak akses (RBAC) di atas saat ini baru berupa *pemilihan role* di dropdown (belum ada login/sesi sungguhan) — lihat bagian 8 di bawah. Jangan diandalkan sebagai batas keamanan sampai sistem login ditambahkan.

## 1. Instalasi

```bash
npm install
cp .env.example .env      # isi kredensial sesuai kebutuhan (lihat bagian ENV di bawah)
npm run db:push           # buat skema database SQLite
npm run db:seed           # isi data contoh (3 bilik, menu, promo, staff)
npm run dev                # jalankan di http://localhost:3000
```

Login staff default hasil seed: `owner@rentalps.local` / `changeme123` (autentikasi login belum di-wire ke UI — password hash sudah tersimpan, tinggal tambahkan halaman login sesuai kebutuhan).

## 2. Menjalankan bot WhatsApp

Bot WhatsApp berjalan sebagai proses terpisah (bukan bagian dari server Next.js) supaya koneksinya tidak putus saat kamu redeploy web app:

```bash
npm run bot:whatsapp
```

Saat pertama kali jalan akan muncul QR code di terminal DAN di halaman **Dashboard → WA / IG Chat AI**. Scan dari HP: WhatsApp → Perangkat Tertaut → Tautkan Perangkat. Sesi tersimpan di `data/wa-auth/` — jangan commit folder ini (sudah masuk `.gitignore`).

> Ini pakai **Baileys** (unofficial WhatsApp Web protocol). Cocok untuk mulai cepat tanpa approval Meta, tapi ada risiko nomor kena banned kalau kirim pesan terlalu agresif/massal. Kalau mau jalur resmi, ganti dengan WhatsApp Cloud API (Meta) — struktur kodenya modular di `src/lib/ai/agent.ts` jadi tinggal buat adapter pengiriman baru.

## 3. Instagram DM

Instagram **wajib** pakai jalur resmi (Meta Graph API), tidak ada alternatif unofficial yang stabil:

1. Buat Meta App di [developers.facebook.com](https://developers.facebook.com), tambahkan produk "Instagram" (Business Messaging).
2. Hubungkan akun Instagram profesional/bisnis ke Facebook Page kamu.
3. Ambil **Page Access Token** dengan permission `instagram_manage_messages`, isi ke `IG_PAGE_ACCESS_TOKEN`.
4. Daftarkan webhook URL `https://domain-kamu.com/api/instagram/webhook` dengan verify token yang sama dengan `IG_VERIFY_TOKEN`.

Deploy dulu ke domain publik (Vercel/VPS) sebelum langkah 4 — Meta perlu bisa mengakses URL webhook-nya.

## 4. Kontrol TV/Konsol (Tasmota via MQTT)

1. Beli smart plug yang bisa diflash [Tasmota](https://tasmota.github.io/docs/) (banyak plug generik ESP8266/ESP32 sudah kompatibel), atau beli yang sudah pre-flashed.
2. Jalankan broker MQTT lokal (paling gampang: [Mosquitto](https://mosquitto.org/) di Raspberry Pi atau mini PC di outlet — supaya kontrol tetap jalan walau internet gedung mati, karena semuanya lokal di jaringan WiFi outlet).
3. Set `MQTT_BROKER_URL` di `.env`, mis. `mqtt://192.168.1.10:1883`.
4. Di halaman **Dashboard → Kontrol Perangkat**, tambahkan tiap smart plug dengan MQTT Topic yang sama seperti dikonfigurasi di Tasmota (menu Configuration → MQTT → Topic).
5. Hubungkan tiap perangkat ke unit rental (Bilik 1, 2, dst) di bagian bawah halaman yang sama.

Selesai — saat kasir klik "Mulai Sesi" di halaman Rental PS, TV otomatis nyala; saat "Selesai & Bayar", otomatis mati.

Kalau pakai smart plug merek lain (Tuya Smart Life / Sonoff eWeLink), pilih protokolnya di form tambah perangkat — tapi adapter untuk keduanya (`src/lib/devices/adapters/tuya.ts` dan `sonoff.ts`) masih **stub** dan butuh kredensial cloud vendor (Tuya IoT Platform Access ID/Secret, atau eWeLink App ID/Secret) yang harus kamu isi sendiri sebelum bisa dipakai — sudah ada instruksi lengkap di komentar masing-masing file.

## 5. Pembayaran

| Metode | Status | Yang perlu disiapkan |
|---|---|---|
| Cash | Selalu aktif | — (kasir konfirmasi manual di POS) |
| QRIS / Fastpay H2H | Mock mode sampai diisi | Daftar merchant di [fastpay.co.id/h2h](https://www.fastpay.co.id/h2h/), isi `FASTPAY_*` di `.env` |
| DANA / GoPay | Mock mode sampai diisi | Sama seperti Fastpay — di-route lewat aggregator Fastpay yang sama |
| BukuPay | Mock mode sampai diisi | Butuh akses partner BukuWarung, isi `BUKUPAY_*` |

**Penting soal Fastpay**: field request/response dan cara tanda tangan (signature) di `src/lib/payments/adapters/fastpay.ts` disusun mengikuti pola umum API H2H (merchant_id + ref_id + signature), tapi **belum diverifikasi terhadap dokumentasi resmi** karena butuh akun merchant aktif untuk mengeceknya. Setelah kamu dapat dokumentasi/Postman collection dari Fastpay, sesuaikan nama field di fungsi `createPayment()` dan `buildSignature()` — strukturnya sudah dibuat modular supaya perubahan ini kecil dan terisolasi.

Tanpa kredensial di atas, semua metode non-cash otomatis jalan di **mock mode** (generate QR dummy) supaya kamu tetap bisa demo alur POS lengkap.

## 6. Struktur Proyek

```
src/
  db/            skema Drizzle (~30 tabel) + koneksi SQLite
  lib/
    payments/    adapter tiap payment gateway (pattern seragam, gampang tambah metode baru)
    devices/     adapter kontrol smart plug (Tasmota/MQTT, HTTP, Tuya, eWeLink)
    ai/          agent Claude + tool-calling ke database (cek stok, harga, buat pre-order, dst)
    instagram/   client kirim pesan via Graph API
    accounting/  mesin double-entry (COA, posting jurnal, void/reversal, trial balance, P&L, neraca, arus kas)
    rental/      pricing engine, sesi (start/pause/resume/extend/stop), booking
    pos/         voucher, split/merge bill, void & refund + approval workflow
    inventory/   purchasing (PO → terima → invoice → bayar), stock opname
    membership/  loyalty & tier otomatis
    shift/       buka/tutup shift, rekonsiliasi kas
    auth/        matriks izin RBAC (belum di-enforce server-side — lihat bagian 8)
    audit/       audit log (best-effort, tidak pernah menggagalkan aksi utama)
    reports/     laporan operasional (penjualan, rental, inventori/HPP, pelanggan)
  app/
    dashboard/   semua halaman UI (control center, rental, booking, POS, inventori, membership,
                 promo, wifi, devices, payments, accounting, shift, staff, chat, laporan)
    api/         semua endpoint backend
scripts/
  seed.ts          isi data contoh
  whatsapp-bot.ts  proses bot WhatsApp (jalankan terpisah dari `npm run dev`)
```

## 7. Deploy ke Produksi

- Next.js app bisa di-deploy ke Vercel/VPS seperti biasa (`npm run build && npm run start`), tapi **database SQLite dan bot WhatsApp butuh filesystem persisten** — jadi kalau pakai Vercel (serverless, filesystem ephemeral), pindahkan `DATABASE_PATH` ke volume persisten atau ganti driver Drizzle ke Postgres (tinggal ganti `src/db/client.ts`, skema di `src/db/schema.ts` sudah portable).
- Cara paling simpel untuk single outlet: jalankan di VPS kecil (mis. 2GB RAM) pakai PM2 untuk `npm run start` + `npm run bot:whatsapp` sebagai dua proses terpisah yang auto-restart.
- Broker MQTT harus bisa diakses dari server yang menjalankan Next.js — kalau server di cloud sementara smart plug ada di jaringan lokal outlet, pertimbangkan MQTT broker cloud (mis. HiveMQ Cloud) atau VPN/port-forward ke broker lokal.
- **Relay Agent (Android TV via Cloud) — WebSocket-nya, pakai Cloudflare Tunnel (disarankan):** `npm run relay:hub` membuka port WebSocket (`RELAY_WS_PORT`, default 8081) tempat Relay Agent di outlet konek. Jangan expose port ini langsung ke internet — banyak wifi hotel/kantor/mall dan ISP memblokir port non-standard, dan port polos tanpa TLS juga tidak aman. Solusinya: taruh di belakang **Cloudflare Tunnel** (`cloudflared`) yang sudah/akan kamu jalankan di server yang sama dengan `relay:hub`, lalu tambahkan **Public Hostname** baru di tunnel itu (Zero Trust dashboard → Networks → Tunnels → tunnel kamu → Public Hostname → Add): Subdomain `relay`, Domain domain kamu, Type `HTTP`, URL `localhost:8081`. Set `RELAY_HUB_PUBLIC_URL=wss://relay.domain-kamu.id` di env server itu (lihat `.env.example`), lalu restart `npm run relay:hub`. Dengan ini agent outlet konek lewat port 443 seperti situs HTTPS biasa (tidak diblokir), TLS otomatis dari Cloudflare (tidak perlu nginx/Caddy), dan URL yang ditampilkan di halaman Devices jadi hostname tetap — bukan placeholder `server-anda` yang harus diisi manual. `RELAY_WS_BIND_HOST` tetap default `127.0.0.1` supaya port 8081 sendiri tidak pernah terbuka langsung ke LAN/internet.
- **Relay Agent — kalau app di-deploy ke hosting serverless (Vercel), terpisah dari server `relay:hub`:** ini kasus berbeda dari di atas (dispatch HTTP app→hub, bukan koneksi WS agent→hub). `relay:hub` tetap harus jalan di VPS/server yang selalu nyala (Vercel tidak bisa menampung proses ini), dan port dispatch-nya (`RELAY_HTTP_PORT`, default 8082) perlu di-forward lewat reverse proxy TLS terpisah (nginx/Caddy) sebagai `https://.../dispatch` untuk app di Vercel. Set `RELAY_HTTP_BIND_HOST=0.0.0.0` + `RELAY_HUB_DISPATCH_SECRET=<rahasia>` di VPS itu, lalu `RELAY_HUB_DISPATCH_URL=https://.../dispatch` + `RELAY_HUB_DISPATCH_SECRET=<rahasia yang sama>` di env Vercel-nya. Detail lengkap ada di komentar `src/lib/relay/config.ts` dan `.env.example`.

## 8. Yang Masih Perlu Kamu Lengkapi

- **Autentikasi login staf sungguhan** — skema & password hash sudah ada di `staff_users` dan endpoint staf sudah lengkap (`/api/staff`), tapi halaman-halaman seperti Shift dan Staf & Hak Akses masih pakai dropdown "login sebagai" untuk demo, bukan session/JWT asli. `jsonwebtoken` & `bcryptjs` sudah terpasang — tinggal buat halaman login + middleware yang membaca session dan mengunci route sesuai role (lihat `src/lib/auth/permissions.ts`, sudah ada matriks izinnya, tinggal di-enforce di server).
- Verifikasi field API Fastpay H2H yang sebenarnya (lihat poin 5 di atas).
- Kredensial Tuya/eWeLink kalau tidak pakai Tasmota.
- Kredensial Meta untuk Instagram DM (poin 3).

## 9. Fase 2 (Belum Dikerjakan — Menyusul)

Modul-modul berikut sengaja ditunda ke fase berikutnya (sesuai kesepakatan pengerjaan bertahap) karena bergantung pada layanan eksternal atau kompleksitas tambahan:

- **Asset Management** — data aset PS/TV/controller (serial number, harga beli, garansi, kondisi, lokasi), penyusutan otomatis, jadwal maintenance, riwayat perbaikan, profitabilitas per unit.
- **Game Management** — katalog game per unit.
- **Notifikasi WhatsApp otomatis** — booking, reminder, invoice, pembayaran, promo (bot WhatsApp untuk chat AI sudah jalan di Fase 0, tinggal ditambah trigger notifikasi terjadwal).
- **QR code per unit PS** — untuk lihat status bilik & pesan F&B langsung dari meja.
- **Kitchen Display System** — layar dapur real-time dari order F&B.
- **AI Business Assistant** — analisis tren omzet/laba/biaya/utilisasi, deteksi anomali, prediksi pendapatan, rekomendasi unit mana yang perlu diperbaiki/diganti.
- **Multi-cabang / multi-outlet penuh** — skema database sudah siap (`outletId` ada di semua tabel), tapi UI untuk switch antar cabang dan laporan konsolidasi lintas cabang belum dibuat (sistem saat ini fokus single-outlet).
#   n e x b i l l  
 #   n e x b i l l  
 