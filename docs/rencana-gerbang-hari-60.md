# Rencana gerbang hari ke-60: Turnamen, Leaderboard, Absensi Staf

Keputusan 25 Okt 2026: **belum dibangun.** Ketiga fitur dinilai di gerbang hari ke-60
(**24 Des 2026**) berdasarkan permintaan nyata dari outlet uji, sesuai strategi "Pantau, jangan
kejar dulu" di dokumen Analisa SWOT & Strategi Kompetitif NEXBILL.

## Lingkup yang sudah dipilih (kalau lolos gerbang)

| Fitur | Versi pertama |
|---|---|
| Turnamen | Bracket gugur (single elimination) 4–64 peserta. Kasir input skor. Bracket publik di `/turnamen/[slug]` dan tampil di papan lobi. Biaya daftar opsional, dicatat sebagai pendapatan. |
| Leaderboard | Total jam main member per bulan, dihitung otomatis dari sesi rental. Tampil di papan lobi dan halaman booking. |
| Absensi staf | Tombol Masuk/Pulang di dashboard. Lokasi HP dicek jaraknya ke titik outlet (memakai geo tag halaman booking). Owner melihat rekap dan keterlambatan. |

## Kriteria gerbang (per fitur, dinilai terpisah)

Bangun bila **minimal satu** terpenuhi:

1. **Permintaan langsung:** minimal 3 outlet uji (dari outlet yang aktif) meminta fitur itu tanpa dipancing.
2. **Kalah karena fitur:** minimal 2 calon pelanggan menyebut fitur itu sebagai alasan memilih pesaing.
3. **Siap bayar:** minimal 1 outlet berbayar menyatakan mau naik paket atau tetap berlangganan karena fitur itu.

Tunda lagi sampai hari ke-90 bila tidak ada yang terpenuhi. Prioritas tetap pada kontrol uang
(selisih kas shift, pembukuan, anti-kecurangan).

## Cara mengumpulkan sinyal (hari 1–60)

- Saat check-in mingguan dengan outlet uji, tanyakan tiga hal yang sama setiap kali:
  1. "Apakah outlet mengadakan turnamen? Seberapa sering, dan dicatat di mana sekarang?"
  2. "Apakah pelanggan bertanya soal peringkat/jam main?"
  3. "Bagaimana mencatat jam masuk karyawan sekarang (buku, WA, fingerprint)?"
- Catat jawaban per outlet: nama outlet, tanggal, kutipan singkat, dan kategori
  (minta / tidak perlu / sudah pakai alat lain).
- Catat juga demo yang kalah: pesaing yang dipilih dan alasannya.

## Catatan teknis untuk saat dibangun

- **Hanya tabel baru**, tidak mengubah tabel lama, dan aman sebelum migrasi dijalankan
  (pola sama dengan migrasi 0035–0036). Perkiraan tabel: `tournaments`,
  `tournament_entries`, `tournament_matches`, `staff_attendance`.
- Leaderboard tidak butuh tabel baru: dihitung dari `rental_sessions` + `customers` (member).
- Absensi memakai `outlet_public_profiles.latitude/longitude` (migrasi 0036) dan izin per role
  yang sudah ada.
- Ikuti CLAUDE.md setelah jadi: aturan paket di `pricing.ts`, baris `plan-matrix.ts` (6 bahasa),
  katalog fitur, dan dokumen SWOT.
- Perkiraan kerja: absensi ±1 hari, leaderboard ±0,5 hari, turnamen bracket ±2–3 hari.
