# Logo merek untuk landing page (section "Aplikasi Android" & "Bekerja dengan")

Komponen: `src/app/landing-showcase.tsx`. Logo pihak ketiga TIDAK digambar ulang — pakai berkas
RESMI dari pemilik merek dan ikuti pedoman merek masing-masing. Selama berkas belum ada, landing
menampilkan chip teks nama sistem (otomatis, tidak perlu ubah kode).

| Berkas                       | Isi                                   | Sumber resmi                                                   |
|------------------------------|---------------------------------------|----------------------------------------------------------------|
| `google-play-badge.png`      | Badge "Get it on Google Play" / "Temukan di Google Play" | https://play.google.com/intl/en_us/badges/ (pakai SETELAH aplikasi rilis produksi; badge wajib menautkan ke halaman aplikasi) |
| `tuya.svg`                   | Logo Tuya / Smart Life                | Kit merek Tuya (developer.tuya.com) / minta ke Tuya            |
| `android-tv.svg`             | Logo Android TV / Google TV           | https://partnermarketinghub.withgoogle.com/                    |
| `tasmota.svg`                | Logo Tasmota                          | https://github.com/arendst/Tasmota (folder gambar resmi)       |
| `qris.svg`                   | Logo QRIS                             | Bank Indonesia / penyedia pembayaran Anda                      |
| `ipaymu.svg`                 | Logo iPaymu                           | Kit merek dari iPaymu (dashboard merchant)                     |

Tinggi tampil ±26px (badge Google Play ±52px). SVG atau PNG transparan, latar gelap.

Status (2026-10-07): sudah ada `tuya.svg`, `tasmota.svg`, `ipaymu.png`, `android.svg`, `google-tv.svg`, `qris.svg`,
`google-play-badge.svg`, `android-robot.svg` (robot saja, untuk lencana Android). Untuk menambah logo baru (mis. `android-tv.svg`, `qris.svg`), taruh berkasnya
di sini lalu isi `file: "/brands/<nama>"` pada entri yang sesuai di `SUPPORTED_SYSTEMS`
(src/app/landing-showcase.tsx). Badge Google Play menjadi tautan setelah `PLAY_STORE_URL` diisi.
