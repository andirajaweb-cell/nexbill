# Aplikasi NEXBILL Android (Play Store) + Cetak Struk Bluetooth

Aplikasi Android NEXBILL adalah **Trusted Web Activity (TWA)**: aplikasi resmi di Play Store yang
membuka `https://dashboard.nexbill.id` layar penuh (tanpa bilah alamat) memakai mesin Chrome di HP.
Karena isinya tetap web, **setiap deploy ke Vercel langsung sampai ke aplikasi** — tidak perlu
rilis ulang di Play Store kecuali mengubah nama, ikon, atau warna aplikasi.

## Yang sudah disiapkan di repo

| Bagian | Lokasi |
|---|---|
| Web App Manifest (`/manifest.webmanifest`) | `src/app/manifest.ts` |
| Ikon aplikasi 192/512 + maskable + apple-touch | `public/icons/` |
| Service worker (hanya halaman offline, tidak cache data) | `public/sw.js`, `public/offline.html`, `src/components/pwa/ServiceWorkerRegister.tsx` |
| Digital Asset Links (`/.well-known/assetlinks.json`) | `src/app/api/assetlinks/route.ts` + rewrite di `next.config.ts` |
| Konfigurasi Bubblewrap | `android/twa-manifest.json` (package `id.nexbill.app`) |
| Skrip build Windows | `android/build.ps1` |
| Aset Play Store (ikon 512, feature graphic 1024×500) | `android/store/` |
| Cetak struk Bluetooth (ESC/POS) | `src/lib/printer/*`, Pengaturan → Printer |

> **Package name `id.nexbill.app` permanen** setelah unggahan pertama ke Play Console. Kalau mau
> nama lain, ubah di `android/twa-manifest.json` **dan** env `TWA_PACKAGE_NAME` sebelum build pertama.

## Langkah 1 — Deploy web dulu

Push & deploy seperti biasa, lalu cek di browser HP:

- `https://dashboard.nexbill.id/manifest.webmanifest` tampil (JSON),
- `https://dashboard.nexbill.id/icons/icon-512.png` tampil,
- `https://dashboard.nexbill.id/.well-known/assetlinks.json` tampil `[]` (masih kosong — normal).

## Langkah 2 — Build aplikasi di PC Windows

Butuh Node.js 18+ (sudah ada). Buka **jendela PowerShell biasa** (Start → ketik PowerShell), bukan
terminal VS Code — build pertama mengunduh Gradle ± 150 MB dan cukup berat, terminal VS Code bisa
ikut tertutup. Dari folder `android`:

```powershell
powershell -ExecutionPolicy Bypass -File .\build.ps1
```

Skrip ini:
1. memasang Bubblewrap CLI,
2. `bubblewrap doctor` — pertama kali menawarkan unduh **JDK 17 + Android SDK** otomatis (jawab *Yes*, ± 1 GB),
3. membuat kunci upload `nexbill-upload.keystore` (sekali saja — **catat password-nya dan simpan cadangan file ini**; file ini otomatis diabaikan git),
4. membuat proyek Android dari `twa-manifest.json` lalu build:
   - `app-release-bundle.aab` → untuk Play Console,
   - `app-release-signed.apk` → untuk dipasang langsung di HP saat uji,
5. menampilkan **SHA-256** kunci upload.

Jendela tidak akan menutup sendiri saat error, dan semua output tercatat di `android/build-log.txt`.
Kalau keystore & proyek sudah pernah dibuat, cukup ulangi bagian build saja:
`powershell -ExecutionPolicy Bypass -File .\build.ps1 -Step build`.

## Langkah 3 — Sambungkan aplikasi dengan domain (wajib)

**Di mana menemukan nilai `TWA_SHA256_FINGERPRINTS`?** Ada dua sidik jari, dua-duanya dimasukkan:

1. **Kunci upload (di PC)** — dari file `nexbill-upload.keystore`:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\build.ps1 -Step fingerprint
   ```
   Masukkan password keystore → tampil `SHA-256 kunci upload: AB:CD:…` (otomatis disalin ke clipboard).
2. **Kunci Google (Play Console)** — setelah AAB pertama diunggah: Play Console → pilih aplikasi →
   **Uji dan rilis → Integritas aplikasi → tab Penandatanganan aplikasi** → bagian
   *Sertifikat kunci penandatanganan aplikasi* → salin **Sidik jari sertifikat SHA-256**.
   (Di halaman yang sama juga ada *Sertifikat kunci upload* — nilainya harus sama dengan nomor 1.)

Tanpa ini aplikasi tetap jalan, tapi muncul bilah alamat Chrome di atas.

1. Vercel → Project → Settings → Environment Variables:
   - `TWA_SHA256_FINGERPRINTS` = SHA-256 dari langkah 2 (format `AB:CD:…`, 32 pasang).
   - (opsional) `TWA_PACKAGE_NAME` = `id.nexbill.app`.
2. Setelah aplikasi diunggah ke Play Console, buka **Uji dan rilis → Integritas aplikasi → Penandatanganan aplikasi**, salin **SHA-256 kunci penandatanganan aplikasi** (milik Google), lalu tambahkan dengan koma:
   `TWA_SHA256_FINGERPRINTS=AA:..(kunci upload)..,BB:..(kunci Google)..`
   Versi yang diunduh dari Play Store ditandatangani dengan kunci Google; APK uji dengan kunci upload — dua-duanya perlu tercantum.
3. Redeploy, lalu cek `https://dashboard.nexbill.id/.well-known/assetlinks.json` sudah berisi package & sidik jari.

## Langkah 4 — Uji di HP

Salin `app-release-signed.apk` ke HP Android → pasang (izinkan "sumber tidak dikenal") → buka.
Pastikan: tidak ada bilah alamat, login jalan, Kasir & Rental PS normal, dan cetak struk (di bawah).

## Langkah 5 — Play Console

1. Daftar akun developer Google Play (biaya sekali bayar, lihat Play Console saat mendaftar).
2. **Buat aplikasi** → nama "NEXBILL — Billing & Kasir Rental PS", gratis, kategori Bisnis.
3. **Pengujian tertutup** dulu, unggah `app-release-bundle.aab`.
   - Akun **pribadi** yang dibuat setelah 13 Nov 2023 wajib uji tertutup dengan **minimal 12 penguji yang ikut terus selama 14 hari** sebelum boleh rilis Produksi, dan sejak 2026 Google juga memeriksa penguji benar-benar memakai aplikasinya. Ajak 12+ pemilik/kasir outlet (cukup Gmail mereka) memakai aplikasi selama dua minggu.
   - Akun **organisasi** (perlu D-U-N-S) tidak terkena syarat ini.
4. **Listingan Play Store**:
   - Ikon: `android/store/play-icon-512.png`; Feature graphic: `android/store/feature-graphic-1024x500.png`.
   - Minimal 2 screenshot HP (ambil dari aplikasi: Rental PS, Kasir, Laporan).
   - Deskripsi singkat (≤ 80 karakter): `Billing rental PS, kasir F&B, kontrol TV & struk Bluetooth dalam satu aplikasi.`
   - Hindari memakai merek "PlayStation"/logo Sony di nama, ikon, dan grafis — pakai "rental PS / konsol game" supaya tidak dianggap meniru merek.
5. **Konten aplikasi**:
   - Kebijakan privasi: `https://nexbill.id/kebijakan-privasi` (sudah tersedia; bagian 9 = cara hapus akun, bisa dipakai juga untuk URL penghapusan akun di formulir Keamanan Data).
   - Akses aplikasi: sediakan **akun demo** (email + password outlet uji) untuk peninjau Google, karena semua fitur di balik login.
   - Keamanan data: aplikasi mengumpulkan nama/email/no. HP akun staf & pelanggan, data transaksi & pembayaran, foto yang diunggah; data dienkripsi saat dikirim (HTTPS); pengguna bisa minta hapus akun. Tidak ada iklan.
   - Rating konten & target pengguna: 18+ (alat bisnis), tidak ditujukan untuk anak.
6. Setelah 14 hari uji tertutup → **Ajukan akses produksi** di Dasbor.

## Aturan Google Play yang sudah ditangani

- **Pembayaran layanan digital**: saat dibuka dari aplikasi Android, NEXBILL masuk "mode aplikasi"
  (`src/lib/app-mode.ts`) — tombol checkout/perpanjang/ganti paket langganan, AI Add-on, top up saldo
  deposit, dan instruksi bayar tagihan langganan disembunyikan, diganti kalimat netral tanpa tautan.
  Toko (smart plug, barang fisik) tetap bisa dibeli. Di browser biasa semuanya tetap normal.
- **Penghapusan akun**: di aplikasi lewat Pengaturan → Akun Saya → Hapus Akun & Data (kode email +
  ketik HAPUS). URL untuk formulir Keamanan Data: `https://nexbill.id/hapus-akun`.
  Permintaan dipantau di Platform Admin → Hapus Akun (Privasi); purge otomatis 30 hari.
- **Kebijakan privasi**: `https://nexbill.id/kebijakan-privasi`.

## Update aplikasi

- Fitur/tampilan baru → cukup deploy web. Tidak perlu apa-apa di Play Store.
- Ganti nama/ikon/warna/shortcut → ubah `twa-manifest.json`, naikkan `appVersionCode` (+1) dan `appVersionName`, jalankan lagi `build.ps1`, unggah AAB baru.

## Cetak struk Bluetooth dari HP

Bisa dari aplikasi Android maupun Chrome di Android. **Tidak didukung di iPhone** (Safari tidak punya Web Bluetooth).

Atur sekali per HP: **Pengaturan → Printer → Cara cetak di perangkat ini**

| Mode | Untuk printer | Cara |
|---|---|---|
| Bluetooth langsung (BLE) | Printer thermal 58/80mm yang mendukung **Bluetooth Low Energy** | Ketuk *Pilih Printer Bluetooth* → pilih printer → *Tes Cetak*. Tanpa dialog print, langsung keluar. |
| Lewat aplikasi RawBT | Printer **Bluetooth Classic** (umumnya printer "pairing pakai PIN 0000/1234" yang tidak muncul di mode BLE) | Pasang **RawBT** dari Play Store, pasangkan printer di RawBT, lalu *Tes Cetak*. |
| Dialog print | PC + printer USB/LAN | Seperti sebelumnya. |

Setelah diatur, tombol **Cetak Struk** di Kasir dan **Struk** di Transaksi langsung mencetak ke printer. Struk berisi data yang sama dengan halaman struk biasa (nama outlet, alamat, no. struk, item, diskon/pajak/pembulatan, total, metode bayar, footer). Centang *Potong kertas otomatis* hanya kalau printernya punya cutter.

Tips:
- Pertama kali tiap aplikasi dibuka, HP bisa meminta memilih printer lagi (aturan keamanan Chrome) — cukup ketuk printer yang sama.
- Kalau gagal kirim, matikan-nyalakan printer lalu cetak lagi (aplikasi otomatis menyambung ulang).
- Huruf Thai/Vietnam beraksen dicetak tanpa aksen/diganti "?" — printer thermal murah hanya mendukung ASCII.

## Pemecahan masalah

| Gejala | Penyebab & solusi |
|---|---|
| Bilah alamat Chrome muncul di atas aplikasi | `assetlinks.json` belum berisi SHA-256 yang benar (kunci upload untuk APK uji, kunci Google untuk versi Play Store). Cek Langkah 3. |
| Printer tidak muncul di daftar Bluetooth | Printer bukan BLE → pakai mode RawBT. Pastikan Bluetooth & Lokasi/Nearby devices HP aktif. |
| "Printer tersambung tapi tidak menyediakan jalur cetak BLE" | Model printer memakai service BLE yang belum dikenal → pakai RawBT, atau kirim nama model printer ke tim NEXBILL supaya UUID-nya ditambahkan di `src/lib/printer/bluetooth-printer.ts`. |
| Halaman "Tidak ada koneksi internet" | HP offline — NEXBILL perlu internet supaya tagihan & timer sinkron. |
