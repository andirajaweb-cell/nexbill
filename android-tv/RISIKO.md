# Daftar risiko NEXBILL TV

Ditinjau ulang 26 Okt 2026 untuk versi **1.2.1** (sesi dari TV, offline, sinkron otomatis). Status: **Ditutup** = sudah diperbaiki di kode · **Dikurangi** = masih ada, dampaknya diperkecil · **Terbuka** = belum ditangani.

Belum ada uji di TV sungguhan — semua penilaian di bawah dari membaca kode. Uji di XTREAM ps menjadi bukti pertama.

## Uang & tagihan (paling penting)

| # | Risiko | Dampak | Status | Penanganan |
|---|---|---|---|---|
| U1 | Sesi dari TV **ditolak server** (unit sudah dipakai sesi lain, layar dinonaktifkan, aksi > 72 jam) → pelanggan tetap main tapi tidak ada tagihan | Tinggi | Ditutup (1.2.1) | Tercatat di dashboard: kartu **Pengawasan NEXBILL TV** di halaman Rental (merah, "belum tertagih") sampai owner menandai sudah ditangani; juga peringatan di layar game TV dan di Status sinkron. Termasuk aksi yang ditolak sebelum diproses. |
| U2 | Listrik padam tepat setelah kasir memulai sesi → aksi belum tertulis → sesi hilang | Tinggi | Ditutup | Antrean & sesi ditulis sinkron (`commit`). |
| U3 | **Mode staf 10 menit** (tes) tidak ditagih dan bisa diulang | Sedang | Dikurangi (1.2.1) | Maksimal 3 kali per TV per hari, ber-PIN, dan setiap pemakaian dicatat (antrean offline) → kartu Pengawasan NEXBILL TV + Audit Log. |
| U4 | Sesi Bebas (tanpa batas) dari TV lupa dihentikan | Sedang | Dikurangi | Ditagih per menit sampai dihentikan (dari TV atau dashboard), jadi pelanggan tetap membayar. |
| U5 | Harga di TV (katalog tersimpan) berbeda dengan harga terbaru saat offline | Rendah | Ditutup | Harga di TV hanya perkiraan; tagihan dihitung server dari tarif/paket yang berlaku. |

## Jam & waktu

| # | Risiko | Dampak | Status | Penanganan |
|---|---|---|---|---|
| J1 | TV tanpa baterai jam kembali ke tahun lama setelah listrik padam → sesi tampak belum habis → layar game terbuka terus | Tinggi | Ditutup (1.2.1) | Waktu aplikasi tidak pernah mundur (titik tertinggi tersimpan + jam monotonik). |
| J2 | Jam TV sengaja dimundurkan untuk main gratis | Tinggi | Ditutup (1.2.1) | Sama dengan J1; perubahan jam juga ditandai server saat sinkron (Mode Offline). |
| J3 | Waktu selama TV mati tidak terhitung → sisa waktu pelanggan berlanjut setelah menyala | Rendah | Diterima | Lebih aman daripada layar yang tidak pernah terkunci; tagihan sesi durasi tetap tidak berubah. |
| J4 | Jam TV loncat jauh ke depan saat offline → aksi ditolak server sebagai "masa depan" (→ U1) | Rendah | Terbuka | Jarang terjadi; jam disamakan lagi begitu online. |

## Kunci layar

| # | Risiko | Dampak | Status | Penanganan |
|---|---|---|---|---|
| K1 | TV menyala tanpa internet & status lama tidak bisa dipulihkan → penjaga layar mati → tombol Home/Input bisa dipakai main | Tinggi | Ditutup (1.2.1) | Penjaga layar tetap aktif walau belum ada status server. |
| K2 | Mode "Pindah input TV" tanpa izin *Tampil di atas aplikasi lain* → layar tidak tertarik kembali saat waktu habis | Sedang | Dikurangi | Petunjuk tampil di layar & menu staf. Tetap bergantung pada pemasangan yang benar. |
| K3 | Penjaga layar dimatikan dari menu staf | Sedang | Dikurangi | Butuh PIN. |
| K4 | Halaman galat WebView tampil saat offline | Rendah | Ditutup (1.2.0) | Screensaver bawaan aplikasi. |

## Akses & data antar-outlet

| # | Risiko | Dampak | Status | Penanganan |
|---|---|---|---|---|
| A1 | TV satu outlet mengatur unit/outlet lain | Tinggi | Ditutup | Outlet & unit dari token layar; aksi untuk unit lain ditolak (tes `tv-session-rules.test.ts`). |
| A2 | PIN layar dipakai bersama → sesi dari TV tercatat atas nama Owner, bukan kasir | Sedang | Terbuka | Perangkat tercatat "NEXBILL TV · unit". Usul: PIN per staf. |
| A3 | PIN bocor → orang lain memulai sesi | Sedang | Dikurangi | Sesi yang dimulai tetap jadi tagihan (bukan uang keluar); PIN tidak membuka pembayaran/laporan. Ganti PIN di dashboard. |
| A4 | PIN offline belum pernah dipakai online di TV itu → kasir tidak bisa memulai sesi saat internet putus | Sedang | Dikurangi | Panduan: masukkan PIN sekali saat online setelah pairing. |
| A5 | Token layar tersimpan di antrean | Rendah | Ditutup | Tidak ikut dikirim/tersimpan di server (hanya kolom protokol). |

## Operasional & distribusi

| # | Risiko | Dampak | Status | Penanganan |
|---|---|---|---|---|
| O1 | HDMI di dalam aplikasi tidak didukung sebagian merek TV | Sedang | Dikurangi | Beralih otomatis ke mode Pindah input TV. |
| O2 | Hanya Android TV / Google TV (bukan VIDAA, webOS, Tizen) | Sedang | Diterima | TV lain memakai smart plug. |
| O3 | Belum di Google Play; pasang lewat Downloader + APK manual | Sedang | Terbuka | Kunci upload yang sama wajib dipakai setiap rilis. |
| O4 | Aksi offline > 72 jam ditolak server | Rendah | Diterima | TV jarang offline selama itu; muncul di Status sinkron. |
| O5 | Belum diuji di TV sungguhan | Tinggi | Terbuka | Uji di XTREAM ps (lihat skenario di README). |

## Langkah berikutnya yang disarankan

1. Uji lapangan 7 hari di XTREAM ps (O5).
2. PIN per staf untuk sesi dari TV (A2).
3. Notifikasi (push/WA) ke owner saat ada sesi dari TV yang ditolak — sekarang baru terlihat di halaman Rental.
