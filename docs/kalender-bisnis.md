# Kalender Bisnis NEXBILL (cuaca BMKG + jadwal sepak bola)

Halaman `/dashboard/kalender-bisnis` (menu **Tumbuh › Kalender Bisnis**, paket **Pro**). Satu kalender (bulan/minggu/hari) yang menggabungkan prakiraan cuaca BMKG, jadwal pertandingan Footballdata.io, transaksi aktual outlet, dan prediksi baseline, untuk mengantisipasi hari sepi/ramai.

## Sumber data (diverifikasi 2026-10-28)

| Sumber | Endpoint | Batas | Catatan |
|---|---|---|---|
| BMKG | `GET https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode desa}` | 60 permintaan/menit/IP, gratis, tanpa key | Prakiraan **3 hari**, per 3 jam, diperbarui 2×/hari. Wajib mencantumkan BMKG sebagai sumber (tampil di halaman). Field yang dipakai: `local_datetime`, `datetime`, `t`, `hu`, `tp` (curah hujan mm — ada di JSON walau tidak di dokumen), `tcc`, `ws`, `wd`, `weather`, `weather_desc(_en)`, `analysis_date`, `lokasi.timezone`. |
| Footballdata.io | `GET /api/v1/leagues`, `GET /api/v1/matches?from&to&page&limit=100` (Bearer key) | Kuota **per bulan**: Free 2.000 (5 liga), Starter 100.000 (50 liga), Pro 300.000 (150 liga) | **Liga 1 Indonesia hanya mulai paket Pro mereka.** Paket Free: Piala Dunia, Premier League, La Liga, Liga Champions, Liga Europa; wajib atribusi (tampil di halaman). 429 = kuota bulanan habis. |
| Situs resmi operator liga (PT Liga Indonesia Baru) | `https://www.ligaindonesiabaru.com/` (pekan berjalan) + `/fixtures/index/{KOMPETISI}/{pekan}/0` | robots.txt `User-agent: * Allow: /` (dicek 2026-10-28) | **Jadwal liga utama Indonesia (BRI Super League, dulu Liga 1)** — tanggal, jam kick-off WIB, tim, stadion. HTML dirender server; diurai `lib-rules.ts`. Tiap 12 jam, ±7 halaman, jeda 1,5 dtk. Laga selesai tidak menampilkan jam, jadi tidak dibuat baris baru dengan jam tebakan. Matikan: `LIB_SCHEDULE=off`. |
| wilayah.id | `GET https://wilayah.id/api/{provinces,regencies,districts,villages}/{kode}.json` | publik, gratis | Pemilih lokasi Provinsi → Kab/Kota → Kecamatan → Desa. Format kode sama dengan adm4 BMKG. Bila tidak tersedia, kode bisa diketik langsung. |

Sumber yang dipertimbangkan tetapi **tidak dipakai**: footy.id (membalas 403 Forbidden ke server & browser), livescore.in (Ketentuan Penggunaan pasal 2.2, 2.9, 2.10 melarang penggunaan komersial, ekstraksi database, dan scraping). Jadwal Tim Nasional Indonesia belum ada — perlu sumber resmi yang mengizinkan.

Nama penyedia jadwal internasional tidak disebut di fitur; atribusi hanya tampil saat paket penyedia gratis (syarat lisensinya), bisa dimatikan `FOOTBALL_DATA_ATTRIBUTION=off` atas keputusan pemilik akun.

## Cara kerja

- **Pengaturan per outlet** (`outlet_activity_settings`): kode desa BMKG, label lokasi, zona waktu (dari BMKG: WIB/WITA/WIT), liga pilihan, tampilkan cuaca/pertandingan. Saat lokasi disimpan, server langsung mengecek ke BMKG — kode yang tidak dikenal ditolak.
- **Cache cuaca per desa** (`activity_weather_cache`): segar 3 jam, ditandai "lama" setelah 12 jam, jeda 10 menit setelah gagal. Saat BMKG gagal/lambat, data terakhir tetap tampil dengan peringatan.
- **Arsip harian** (`activity_weather_daily`): ringkasan prakiraan terakhir per tanggal — dasar analisis historis (BMKG tidak menyediakan riwayat). Ini **arsip prakiraan, bukan observasi**, dan diberi label begitu di UI.
- **Pertandingan** (`activity_football_matches`): satu sinkron untuk semua outlet (jendela 7 hari lalu s.d. 30 hari ke depan; sinkron pertama 60 hari ke belakang untuk analisis). Kick-off disimpan UTC dan dikonversi ke zona waktu outlet saat ditampilkan. Pertandingan tanpa waktu kick-off dibuang (tidak mengarang jam).
- **Hemat kuota**: sinkron otomatis tiap 6 jam, maks. 5 halaman, berhenti otomatis bila sisa kuota < 60; tombol "Perbarui sekarang" maks. sekali per 15 menit. Perkiraan pemakaian paket Free ±300–400 permintaan/bulan.
- **Sinkron terjadwal**: `scripts/booking-scheduler.ts` (pm2 `scheduler` di VPS) memanggil `runActivitySync()` tiap 30 menit. Cadangan: halaman yang dibuka saat data basi memicu pembaruan di latar (`after()`).
- **HTTP**: timeout 8–10 dtk, coba ulang terbatas hanya untuk jaringan/5xx (dan 429 BMKG), jeda eksponensial + Retry-After. Log hanya host+path — API key tidak pernah ditulis ke log atau dikirim ke browser.
- **Isolasi outlet**: semua query transaksi dan pengaturan memakai `session.outletId`; data cuaca & jadwal bersifat publik dan dibagi.

## Insight & analisis

- **Aktual**: sesi rental selesai (tanggal/jam mulai, waktu lokal; proksi kunjungan, bukan orang unik), durasi rata-rata, omzet (order selain *cancelled*, sama dengan Penjualan Kotor di Laporan).
- **Prakiraan/Jadwal**: BMKG dan Footballdata.io.
- **Prediksi**: rata-rata hari yang sama dalam seminggu, 8 minggu terakhir (min. 3 hari). Tidak disesuaikan dengan cuaca/pertandingan.
- **Analisis 90 hari**: hari hujan di jam buka (arsip prakiraan) dan hari dengan pertandingan jam 15.00–23.59 dibandingkan dengan hari tanpa kondisi itu, **dinormalkan per hari dalam seminggu**. Hanya tampil bila tiap kelompok ≥ 5 hari; selisih < 5% = "tidak terlihat perbedaan berarti". UI menyatakan ini korelasi, bukan sebab-akibat.

## File

- Migrasi: `supabase/migrations/0039_activity_calendar.sql` (5 tabel baru, aman dijalankan ulang) + skema di `src/db/schema.ts`.
- Aturan murni + tes: `src/lib/activity-calendar/{bmkg-rules,football-rules,insights-rules}.ts`, `rules.test.ts`.
- Service: `src/lib/activity-calendar/{http,bmkg,football,wilayah,data,calendar,sync}.ts`.
- API: `src/app/api/activity-calendar/{route,settings/route,wilayah/route,refresh/route}.ts`.
- UI: `src/app/dashboard/kalender-bisnis/{page,views,DetailPanel,SettingsDialog,shared}.tsx`, kamus `src/lib/i18n/dict-activity.ts` (6 bahasa).
- Paket/menu: `src/lib/subscription/{pricing,plan-matrix}.ts` (`activity_calendar`, Pro), `src/lib/nav/menu.ts`, `src/components/dashboard/{Sidebar,LockedFeaturePreview}.tsx`, `src/lib/i18n/{dict-shell,dict-plan}.ts`.
- Scheduler: `scripts/booking-scheduler.ts`. Katalog: `public/downloads/katalog-fitur-nexbill.html`.

## Environment variables

| Nama | Wajib | Di mana | Keterangan |
|---|---|---|---|
| `FOOTBALL_DATA_API_KEY` | Ya, untuk jadwal sepak bola | Vercel **dan** `.env` VPS (`/opt/nexbill`) | API key Footballdata.io. Tanpa ini halaman tetap jalan (cuaca saja) dengan pesan jelas. |
| `FOOTBALL_DATA_API_BASE` | Tidak | — | Bawaan `https://footballdata.io/api/v1`. |
| `BMKG_API_URL` | Tidak | — | Bawaan `https://api.bmkg.go.id/publik/prakiraan-cuaca`. |
| `LIB_SCHEDULE` | Tidak | — | `off` mematikan pengambilan jadwal liga Indonesia. |
| `LIB_SCHEDULE_URL` | Tidak | — | Bawaan `https://www.ligaindonesiabaru.com`. |
| `FOOTBALL_DATA_ATTRIBUTION` | Tidak | — | `off` menyembunyikan atribusi penyedia jadwal internasional. |
| `WILAYAH_API_URL` | Tidak | — | Bawaan `https://wilayah.id/api`. |

## Deployment

1. Jalankan `0039_activity_calendar.sql` di Supabase SQL Editor.
2. Daftar di footballdata.io (paket Free cukup untuk mulai), isi `FOOTBALL_DATA_API_KEY` di Vercel lalu redeploy.
3. Di VPS: `cd /opt/nexbill && git pull && npm install`, tambahkan `FOOTBALL_DATA_API_KEY` ke `.env`, lalu `pm2 restart scheduler --update-env`.
4. Buka Kalender Bisnis › Pengaturan, pilih lokasi outlet dan liga.

## Keterbatasan

- BMKG hanya 3 hari ke depan; tanggal setelahnya tidak berwarna cuaca. Tidak ada data cuaca historis resmi — analisis memakai arsip prakiraan yang mulai terkumpul sejak lokasi diatur.
- Liga Indonesia tidak tersedia di paket Free/Starter Footballdata.io. Daftar liga di pengaturan mengikuti paket key yang dipasang, dan liga Indonesia otomatis diurutkan paling atas bila tersedia.
- Status pertandingan bergantung pada sumber; status yang tidak dikenali ditampilkan "Status belum ada".
- Sesi rental adalah proksi kunjungan; outlet tanpa sesi/omzet pada suatu hari dianggap tutup dan tidak ikut rata-rata.
