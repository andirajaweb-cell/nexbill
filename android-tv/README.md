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

Proyek ini tidak memakai pustaka tambahan, hanya framework Android. AGP 8.9.1 dan Gradle 8.11.1 sama dengan proyek TWA di `../android`, jadi JDK 17 yang sama cukup.

**Uji coba (APK debug):**

1. Buka folder `android-tv` di Android Studio, tunggu Gradle sync selesai.
2. Pilih *Build › Build App Bundle(s) / APK(s) › Build APK(s)*.
3. Hasilnya ada di `app/build/outputs/apk/debug/app-debug.apk`.
4. Pasang di TV lewat flashdisk + aplikasi file manager. TV akan meminta izin "instal aplikasi tidak dikenal" untuk file manager itu; ini bukan Developer options.

**Rilis (Play Store):**

1. Pilih *Build › Generate Signed App Bundle*.
2. Buat kunci upload baru, misalnya `nexbill-tv-upload.keystore`. Simpan di luar repo dan buat cadangannya. File `.gitignore` sudah menolak `*.keystore`.
3. Di Play Console, buat aplikasi baru **NEXBILL TV** (package `id.nexbill.tv`).
4. Di *Advanced settings › Form factors*, tambahkan **Android TV**. Google meninjau aplikasi TV secara terpisah dan meminta:
   - banner TV 1280×720;
   - screenshot TV 1920×1080;
   - aplikasi bisa dipakai penuh dengan remote.
5. Isi formulir **Foreground service**. Tipenya `specialUse`, alasannya timer billing bilik. Siapkan video singkat: sesi dimulai di kasir → TV menampilkan game + timer → waktu habis → layar terkunci.
6. Data safety: aplikasi tidak mengumpulkan data pribadi. Yang disimpan hanya token layar dan pilihan input HDMI di TV.

## Catatan pengujian

- Kode Java ini sudah dikompilasi terhadap stub API Android, tapi **belum dibuild dengan Android SDK asli dan belum dicoba di TV sungguhan**. Kalau Android Studio menampilkan galat saat build pertama, kirim pesan galatnya.
- Uji di outlet uji (XTREAM ps):
  1. Pairing.
  2. Pilih HDMI.
  3. Mulai sesi 5 menit → game tampil + timer.
  4. Peringatan sisa waktu.
  5. Waktu habis → layar NEXBILL dan suara berhenti.
  6. Cabut internet di tengah sesi → TV tetap terkunci tepat waktu.
  7. Restart TV → aplikasi menyala sendiri, terutama bila sudah dijadikan aplikasi utama.
- `TvView` dengan input HDMI didukung di banyak Android TV, tapi tidak dijamin di semua merek. Itulah alasan mode cadangan *Pindah input TV*.
