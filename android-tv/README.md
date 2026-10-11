# NEXBILL TV — aplikasi Android TV untuk layar bilik

Aplikasi kecil yang dipasang langsung di Android TV / Google TV. Ini cara kontrol TV paling mudah di NEXBILL: **tanpa PC, tanpa HP relay, tanpa Developer options, tanpa ADB**.

## Cara kerja

1. Aplikasi membuka halaman `https://dashboard.nexbill.id/tv?app=1` di dalam WebView. Halaman ini sama dengan TV Screensaver: pairing kode 6 digit, screensaver, dan layar "Waktu Habis".
2. Setelah pairing, halaman `/tv` memberi token layar ke aplikasi lewat jembatan JavaScript `NexbillTvApp.setToken()`. Aplikasi lalu mengambil `/api/tv/state` sendiri setiap 5 detik (`PollService`).
3. Saat ada sesi berjalan di kasir, aplikasi menampilkan gambar dari input HDMI konsol (`TvView`) dengan timer di pojok kanan atas.
4. Saat waktu habis atau tidak ada sesi, HDMI dihentikan (gambar **dan** suara), dan halaman `/tv` menutup layar.
5. Timer tetap dihitung di TV kalau internet putus, jadi layar tetap terkunci tepat waktu.

Kalau merek TV tidak mengizinkan HDMI tampil di dalam aplikasi, aplikasi beralih ke mode **Pindah input TV**. TV dipindah ke input HDMI-nya, timer tampil sebagai overlay, dan layar NEXBILL dibawa kembali saat waktu habis. Mode ini butuh izin *Tampil di atas aplikasi lain*.

**Menu staf:** tahan OK di remote 3 detik, atau tekan tombol Menu. Kalau layar diberi PIN di Pengaturan › TV Screensaver, PIN itu yang diminta. Isinya:

- buka layar game 10 menit (untuk tes);
- pilih input HDMI;
- ganti mode tampilan;
- izin overlay;
- jadikan aplikasi utama TV;
- muat ulang layar;
- info perangkat.

## Yang perlu disiapkan di dashboard

- Pengaturan › Feature Management: **TV Screensaver** aktif.
- Rental PS: tipe TV unit = **Android TV**.
- Pengaturan › TV Screensaver: tambah layar untuk unit itu. Kode 6 digitnya diketik di aplikasi.

Panduan untuk merchant ada di Kontrol Perangkat › Panduan › tab **Aplikasi NEXBILL TV**.

## Build

Proyek ini tidak memakai pustaka tambahan, hanya framework Android (AGP 8.9.1, Gradle 8.11.1, JDK 17).

### Cara 1 — `build.ps1` di PC Windows (tanpa Android Studio)

Memakai JDK 17 dan Android SDK yang **sudah dipasang Bubblewrap** saat membangun aplikasi NEXBILL Android (`../android/build.ps1`). Kalau itu belum pernah dijalankan, jalankan dulu sekali.

```
cd "C:\AGENTIC\POS Rental PS\pos-rental-ps\android-tv"
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Step debug     # APK uji saja, tanpa kunci
powershell -ExecutionPolicy Bypass -File .\build.ps1                 # APK uji + APK/AAB rilis bertanda tangan
powershell -ExecutionPolicy Bypass -File .\build.ps1 -Step publish   # rilis + terbitkan ke nexbill.id/tvapk
```

- Pertama kali build rilis, skrip membuat kunci upload `nexbill-tv-upload.keystore` dan meminta password. **Catat password-nya dan simpan cadangan file kunci di luar PC** (mis. Google Drive pribadi). Tanpa kunci yang sama, versi baru tidak bisa memperbarui aplikasi yang sudah terpasang di TV — semua TV harus uninstall dulu. File kunci sudah ditolak `.gitignore`.
- `-Step publish` menyalin APK rilis ke `public/downloads/nexbill-tv/nexbill-tv.apk` dan menulis `latest.json` (versi, ukuran, SHA-256). Commit kedua file itu lalu push.
- Skrip menolak build kalau `versionName`/`versionCode` di `app/build.gradle` tidak sama dengan `APP_VERSION`/`VERSION_CODE` di `Config.java`. Naikkan keduanya setiap rilis.

### Cara 2 — GitHub Actions (otomatis)

Setiap push yang mengubah `android-tv/**` menjalankan `.github/workflows/nexbill-tv.yml`: build APK debug + lint dengan JDK 17 dan Android SDK asli. Hasilnya bisa diunduh di tab **Actions › run terbaru › Artifacts › nexbill-tv-debug-apk**. Ini juga pemeriksaan kompilasi yang sesungguhnya — kalau merah, buka log langkah "Build APK debug". APK rilis tetap dibuat di PC (Cara 1), karena kunci upload tidak pernah diunggah ke GitHub.

### Cara 3 — Android Studio

Buka folder `android-tv`, tunggu Gradle sync, lalu *Build › Build App Bundle(s) / APK(s)*.

## Memasang di TV (tanpa flashdisk)

1. Di TV, buka Google Play → pasang aplikasi gratis **Downloader** (by AFTVnews).
2. Buka Downloader → ketik `nexbill.id/tvapk` → **Go** → **Install**. Kalau TV bertanya, izinkan Downloader memasang aplikasi tidak dikenal.
3. Buka NEXBILL TV → ketik kode 6 digit dari Pengaturan › TV Screensaver.

`nexbill.id/tvapk` dialihkan ke `public/downloads/nexbill-tv/nexbill-tv.apk` (lihat `src/app/tvapk/route.ts`). Memperbarui = ulangi langkah 2; pairing dan pengaturan tetap tersimpan selama APK ditandatangani kunci yang sama. Menu staf punya **Cek pembaruan aplikasi** yang membaca `latest.json`. Aplikasi sengaja tidak memasang pembaruan sendiri, karena itu dilarang kebijakan Google Play.

## Rilis ke Play Store

1. `build.ps1` (Cara 1) → `app/build/outputs/bundle/release/app-release.aab`.
2. Di Play Console, buat aplikasi baru **NEXBILL TV** (package `id.nexbill.tv`) dan aktifkan **Play App Signing**. Supaya TV yang sudah memasang APK dari `nexbill.id/tvapk` bisa langsung diperbarui dari Play Store, pilih memakai kunci sendiri dan unggah `nexbill-tv-upload.keystore` sebagai kunci penandatanganan aplikasi.
3. Di *Advanced settings › Form factors*, tambahkan **Android TV**. Google meninjau aplikasi TV secara terpisah dan meminta:
   - banner TV 1280×720 (`app/src/main/res/drawable/banner.png`);
   - screenshot TV 1920×1080;
   - aplikasi bisa dipakai penuh dengan remote.
4. Isi formulir **Foreground service**. Tipenya `specialUse`, alasannya timer billing bilik. Siapkan video singkat: sesi dimulai di kasir → TV menampilkan game + timer → waktu habis → layar terkunci.
5. Data safety: aplikasi tidak mengumpulkan data pribadi. Yang disimpan hanya token layar dan pilihan input HDMI di TV.
6. Kalau di langkah 2 memakai kunci buatan Google, tanda tangan APK dari Play Store berbeda dengan APK manual — TV yang memakai APK manual perlu uninstall sekali lalu pasang dari Play Store.

## Catatan pengujian

- Kode Java ini sudah dikompilasi terhadap stub API Android. Build dengan Android SDK asli terjadi di GitHub Actions / `build.ps1`; **belum dicoba di TV sungguhan**. Kalau build gagal, kirim pesan galatnya.
- Uji di outlet uji (XTREAM ps):
  1. Pairing.
  2. Pilih HDMI.
  3. Mulai sesi 5 menit → game tampil + timer.
  4. Peringatan sisa waktu.
  5. Waktu habis → layar NEXBILL dan suara berhenti.
  6. Cabut internet di tengah sesi → TV tetap terkunci tepat waktu.
  7. Restart TV → aplikasi menyala sendiri, terutama bila sudah dijadikan aplikasi utama.
- `TvView` dengan input HDMI didukung di banyak Android TV, tapi tidak dijamin di semua merek. Itulah alasan mode cadangan *Pindah input TV*.
