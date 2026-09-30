import type { HelpCategory } from "../../types";

export const MULAI: HelpCategory[] = [
  {
    id: "mulai-disini",
    group: "mulai",
    label: "Selamat Datang — Mulai dari Sini",
    summary:
      "NEXBILL adalah aplikasi untuk menjalankan usaha rental PlayStation: menghitung waktu main, menerima pembayaran, menjual makanan/minuman, mencatat stok, sampai membuat laporan keuangan secara otomatis. Topik ini menjelaskan cara memakai Pusat Bantuan dan cara berpindah menu, supaya kamu tidak bingung di hari pertama.",
    subsections: [
      {
        title: "Cara memakai Pusat Bantuan ini",
        steps: [
          "Daftar topik ada di sebelah kiri, dikelompokkan dari yang paling dasar (Mulai di Sini) sampai yang paling lanjut (Manajemen & Sistem).",
          "Ketik kata di kotak pencarian (mis. \"shift\", \"struk\", \"stok\", \"TV\") — daftar topik langsung menyaring topik yang mengandung kata itu, termasuk di dalam langkah-langkahnya.",
          "Setiap topik berisi: Ringkasan (apa gunanya), Cara Pakai (langkah bernomor), dan Hal Penting (hal yang sering keliru). Ikuti langkahnya berurutan.",
          "Kalau baru pertama kali, baca berurutan: Konsep Dasar → Cara Setup Outlet Baru → Alur Kerja Sewa PlayStation → Panduan per Peran sesuai tugasmu.",
          "Menemukan kendala? Buka grup \"Bantuan & Istilah\" di bagian paling bawah: ada daftar Masalah Umum & Solusinya dan Kamus Istilah.",
        ],
      },
      {
        title: "Masuk (login) dan keluar",
        steps: [
          "Buka dashboard.nexbill.id, masukkan email dan password akunmu, lalu tekan Masuk. Akun yang dibuat lewat Google bisa langsung masuk dengan tombol Google.",
          "Lupa password? Tekan \"Lupa password\" di halaman login, ikuti tautan yang dikirim ke email.",
          "Untuk keamanan, satu akun hanya boleh aktif di satu perangkat/browser dalam waktu bersamaan. Kalau kamu login di HP lalu mencoba login di PC, PC akan ditolak sampai kamu keluar dari HP, atau akun tidak dipakai selama 30 menit, atau Owner menekan \"Keluarkan\" di menu Staf & Hak Akses.",
          "Selesai bekerja, tekan Keluar di menu akun (kanan atas) — terutama di komputer yang dipakai bergantian.",
        ],
      },
      {
        title: "Mengenal tampilan dashboard",
        steps: [
          "Sidebar kiri berisi semua menu, diurutkan sesuai alur kerja: Operasional (Rental PS, Kasir, Booking) di atas, lalu Penjualan & Pelanggan, Inventori & Keuangan, dan Pengaturan di bawah. Di HP, sidebar dibuka lewat tombol menu (☰).",
          "Bagian atas (top bar) berisi: nama outlet aktif, ikon lonceng Notifikasi, pilihan bahasa, dan menu akunmu.",
          "Ganti bahasa lewat pilihan bahasa di top bar — tersedia Indonesia, English, Melayu, ไทย, Filipino, dan Tiếng Việt. Pusat Bantuan ini ikut berganti bahasa.",
          "Menu yang tidak dipakai outletmu (mis. Home Rental, PPOB, TV Screensaver) bisa dimatikan Superuser di Pengaturan → Feature Management supaya sidebar lebih ringkas.",
        ],
      },
    ],
    notes: [
      "Semua data tersimpan online (cloud). Kamu bisa membuka NEXBILL dari PC, laptop, tablet, atau HP — cukup lewat browser (disarankan Google Chrome atau Microsoft Edge versi terbaru).",
      "Butuh bantuan manusia? Buka menu Customer Service untuk mengirim pertanyaan langsung ke tim NEXBILL.",
    ],
  },
  {
    id: "konsep-dasar",
    group: "mulai",
    label: "Konsep Dasar NEXBILL",
    summary:
      "Lima hal yang perlu dipahami sebelum memakai NEXBILL: outlet, akun & peran staf, shift kasir, transaksi yang tercatat otomatis, dan pembukuan otomatis. Kalau lima hal ini sudah jelas, menu-menu lain akan terasa masuk akal.",
    subsections: [
      {
        title: "1. Outlet (cabang)",
        steps: [
          "Outlet adalah satu tempat usaha. Semua data (unit PS, produk, transaksi, laporan) selalu milik satu outlet tertentu.",
          "Punya lebih dari satu cabang? Satu akun bisa terhubung ke beberapa outlet. Menu \"Semua Outlet\" akan muncul untuk melihat ringkasan semua cabang dan berpindah cabang dengan satu klik.",
          "Data antar-outlet tidak pernah tercampur — outlet lain (termasuk milik orang lain) tidak bisa melihat datamu.",
        ],
      },
      {
        title: "2. Akun staf dan peran (role)",
        steps: [
          "Setiap orang yang bekerja sebaiknya punya akun sendiri — jangan berbagi satu akun, supaya jelas siapa melakukan apa.",
          "Peran menentukan apa yang boleh dilakukan: Superuser (akun tertinggi, bisa mengatur semuanya termasuk izin), Owner (pemilik), Manager, Accountant (akuntan), Supervisor, Cashier (kasir), dan Kitchen (dapur).",
          "Sebagian besar menu bisa DILIHAT semua staf, tapi tombol untuk mengubah data (tambah, edit, hapus, setujui) hanya muncul untuk peran yang berhak. Jadi kalau kasir bisa membuka halaman Accounting tapi tidak bisa mengubah apa pun, itu memang disengaja.",
        ],
      },
      {
        title: "3. Shift kasir",
        steps: [
          "Shift adalah masa kerja satu kasir memegang laci uang. Buka shift sebelum mulai berjualan (isi uang modal yang ada di laci), tutup shift saat selesai (hitung uang di laci).",
          "Semua uang tunai yang masuk dan keluar selama shift dijumlahkan sistem, lalu dibandingkan dengan hasil hitunganmu — selisihnya langsung terlihat setelah shift ditutup.",
        ],
      },
      {
        title: "4. Transaksi tercatat otomatis",
        steps: [
          "Setiap sesi rental, penjualan kasir, sewa bawa pulang, PPOB, pengeluaran, dan pembelian stok otomatis tercatat — kamu tidak perlu menyalin ulang ke buku atau Excel.",
          "Semua transaksi bisa dicari kembali di menu Transaksi, lengkap dengan struknya.",
        ],
      },
      {
        title: "5. Pembukuan (akuntansi) otomatis",
        steps: [
          "Di balik setiap transaksi, NEXBILL membuat catatan pembukuan (jurnal) secara otomatis. Hasilnya laporan Laba Rugi, Neraca, dan Arus Kas yang selalu terbaru.",
          "Daftar akun pembukuan (Chart of Accounts) sudah disiapkan sejak outlet dibuat. Pemilik outlet biasa tidak perlu mengerti akuntansi untuk memakai NEXBILL — cukup jalankan transaksi dengan benar.",
        ],
      },
    ],
    notes: [
      "Beberapa tombol paling berisiko (hapus permanen, ubah matriks izin) hanya muncul untuk akun Superuser — bahkan Owner tidak melihatnya. Kalau tombol \"Hapus\" tidak muncul, itu bukan error.",
      "Hampir semua kesalahan input bisa dibatalkan (void/refund/batalkan) tanpa menghapus data — riwayatnya tetap tersimpan supaya laporan tetap jujur.",
    ],
  },
  {
    id: "setup-outlet-baru",
    group: "mulai",
    label: "Cara Setup Outlet Baru (Checklist Lengkap)",
    summary:
      "Urutan langkah yang disarankan sebelum outlet mulai melayani pelanggan — dari mengisi profil usaha sampai transaksi uji coba pertama. Langkah bertanda (opsional) boleh dilewati dan dikerjakan belakangan.",
    subsections: [
      {
        title: "Langkah 1 — Isi profil usaha, pajak & negara",
        navHint: "Pengaturan → Business & Tax",
        steps: [
          "Isi nama usaha, logo, nomor telepon, alamat lengkap, dan Negara. Negara menentukan mata uang yang tampil dan bahasa balasan dari tim Customer Service NEXBILL.",
          "Isi nama & password WiFi kalau ingin ditampilkan ke pelanggan (di struk, halaman booking online, atau layar TV Screensaver). Di TV hanya nama WiFi yang tampil, tidak pernah passwordnya.",
          "Atur Pajak (%), Service Charge (%), dan pembulatan tagihan (mis. dibulatkan ke Rp500/Rp1.000 supaya tidak ada sisa receh).",
          "Isi Target Penjualan bulanan (BEP). Dashboard Ringkasan akan menampilkan target harian dan progresnya.",
          "Atur batas pengeluaran yang disetujui otomatis (bawaan Rp500.000). Pengeluaran di atas batas ini menunggu persetujuan Owner/Manager.",
          "Tulis teks Footer Struk (mis. \"Terima kasih, sampai jumpa lagi!\").",
        ],
      },
      {
        title: "Langkah 2 — Tambah unit PlayStation & tarif",
        navHint: "Rental PS → tombol \"Kelola Unit\"",
        steps: [
          "Tambahkan setiap unit satu per satu: nama unit (mis. \"PS5 - Bilik 1\"), jenis konsol (PS2 sampai PS5 Slim), jenis TV, dan tarif sewa per jam.",
          "Jenis TV penting untuk kontrol otomatis: Android TV bisa dinyalakan/dimatikan lewat aplikasi NexbillAgent, sedangkan TV biasa (analog/smart TV non-Android) butuh smart plug.",
          "Kalau menjual paket harga tetap (mis. \"Paket 3 Jam PS4 Rp45.000\"), buat di menu Promo & Paket. Pilihan durasi cepat (30/60/90 menit, dst.) bisa diatur di Pengaturan → Durasi Rental.",
          "Cek: semua unit muncul di halaman Rental PS dan tidak berstatus Maintenance.",
        ],
      },
      {
        title: "Langkah 3 — Atur metode pembayaran",
        navHint: "Menu \"Pembayaran\"",
        steps: [
          "Tunai (Cash) sudah ada otomatis.",
          "Tambahkan metode non-tunai yang benar-benar dipakai: QRIS, transfer bank, GoPay, DANA, kartu debit, dll.",
          "Untuk QRIS/transfer, unggah gambar QRIS statis outlet dan isi rekening bank outlet — keduanya ditampilkan ke pelanggan saat kasir memilih metode itu. Uang selalu masuk langsung ke rekening outlet, tidak lewat NEXBILL.",
        ],
      },
      {
        title: "Langkah 4 — Tambah staf & atur peran",
        navHint: "Staf & Hak Akses",
        steps: [
          "Buat akun untuk setiap staf: nama, email, password, dan peran (Manager/Accountant/Supervisor/Cashier/Kitchen).",
          "Pastikan setiap staf sudah mencoba login sebelum hari pertama buka.",
        ],
      },
      {
        title: "Langkah 5 (opsional) — Hubungkan TV & perangkat",
        navHint: "Kontrol Perangkat",
        steps: [
          "Android TV: ikuti \"Panduan Setup Perangkat\" di halaman Kontrol Perangkat (minta token, unduh NexbillAgent ke PC kasir, sambungkan TV).",
          "TV biasa (bukan Android): pasang smart plug lalu daftarkan di halaman yang sama. Halaman ini akan mengingatkan unit mana yang masih butuh smart plug.",
          "Hubungkan setiap perangkat ke unit rental yang sesuai. Langkah ini boleh dilewati — TV tetap bisa dinyalakan manual dengan remote.",
        ],
      },
      {
        title: "Langkah 6 — Siapkan printer struk",
        navHint: "Pengaturan → Business & Tax → Printer",
        steps: [
          "Colokkan printer struk ke komputer kasir dan pastikan terpasang di Windows.",
          "Coba cetak struk dari transaksi uji coba (Langkah 10). Kalau lebar struk tidak pas, isi lebar kertas (58mm/80mm) lalu tekan \"Simpan untuk Komputer Ini\" — ulangi di setiap komputer kasir.",
        ],
      },
      {
        title: "Langkah 7 (opsional) — Produk makanan/minuman & stok",
        navHint: "Inventory Control",
        steps: [
          "Tambahkan produk satu per satu, atau unduh template Excel lalu upload sekaligus.",
          "Isi Harga Modal setiap produk — tanpa itu laporan menganggap penjualan untung 100%.",
          "Untuk menu olahan (mis. mi goreng, es teh), buat Resep supaya stok bahan berkurang otomatis setiap menu terjual.",
          "Tambahkan Supplier kalau ingin mencatat belanja stok.",
        ],
      },
      {
        title: "Langkah 8 (opsional) — Nyalakan modul tambahan",
        navHint: "Pengaturan → Feature Management (khusus Superuser)",
        steps: [
          "Home Rental: kalau outlet juga menyewakan PS/TV untuk dibawa pulang.",
          "PPOB: kalau outlet juga menjual pulsa, token listrik, top up e-wallet.",
          "TV Screensaver: kalau ingin layar TV Android di bilik menampilkan promosi saat tidak dipakai.",
          "Modul yang tidak dipakai biarkan mati supaya menu staf tidak membingungkan.",
        ],
      },
      {
        title: "Langkah 9 — Saldo awal (khusus outlet yang sudah berjalan)",
        navHint: "Accounting → Migrasi Data",
        steps: [
          "Outlet yang benar-benar baru boleh melewati langkah ini.",
          "Kalau outlet sudah beroperasi sebelum memakai NEXBILL, isi Saldo Awal (uang kas, rekening, piutang, hutang, modal) per tanggal mulai memakai NEXBILL, supaya Neraca benar sejak hari pertama.",
          "Aset yang sudah dimiliki (unit PS, TV, kursi) bisa dimasukkan sekaligus lewat menu Aset → Upload Excel dengan pilihan \"Saldo awal\".",
        ],
      },
      {
        title: "Langkah 10 — Buka shift & transaksi uji coba",
        navHint: "Shift & Kasir, lalu Rental PS",
        steps: [
          "Buka shift pertama dengan uang modal yang sebenarnya ada di laci.",
          "Lakukan satu transaksi uji coba lengkap: mulai sesi di satu unit, tambahkan 1 minuman, akhiri sesi, bayar (coba tunai dan satu metode non-tunai), lalu cetak struk.",
          "Periksa transaksinya muncul di menu Transaksi dan (kalau ada makanan) di Kitchen Display.",
          "Batalkan (void) transaksi uji coba itu supaya tidak ikut laporan penjualan sungguhan.",
        ],
      },
    ],
    notes: [
      "Urutan ini saran, bukan kewajiban. Yang penting Langkah 1–4, 6, dan 10 selesai sebelum melayani pelanggan.",
      "Lanjutkan dengan topik \"Alur Kerja Sewa PlayStation\" untuk melihat bagaimana semua bagian saling terhubung.",
    ],
  },
  {
    id: "alur-kerja-rental",
    group: "mulai",
    label: "Alur Kerja Sewa PlayStation (dari Awal sampai Laporan)",
    summary:
      "Gambaran satu sesi sewa dari pelanggan datang sampai uangnya masuk laporan keuangan — supaya kamu paham Booking, Rental PS, Kitchen, Shift, Transaksi, dan Accounting saling terhubung, bukan menu yang berdiri sendiri.",
    subsections: [
      {
        title: "1. Sebelum pelanggan datang (opsional — booking)",
        steps: [
          "Pelanggan memesan lewat telepon/WhatsApp → kasir mencatat di menu Booking. Atau pelanggan memesan sendiri lewat halaman booking online outlet (tautannya ada di Pengaturan → Business & Tax).",
          "Kalau jadwal bentrok, pesanan masuk Waiting List (antrean), bukan ditolak.",
          "Saat pelanggan datang, kasir mengetik kode booking untuk check-in cepat.",
        ],
      },
      {
        title: "2. Pelanggan datang — mulai sesi",
        steps: [
          "Buka Rental PS, pilih unit yang kosong, pilih Paket (harga tetap) atau Per Jam, isi nama pelanggan (atau pilih member).",
          "Kalau kebijakan outlet meminta uang muka (DP), centang DP dan terima uangnya.",
          "Tekan Mulai Sesi. Kalau unit terhubung ke TV/smart plug, TV bisa menyala sendiri.",
        ],
      },
      {
        title: "3. Selama bermain",
        steps: [
          "Pesan makanan/minuman → tekan +F&B di kartu sesi. Pesanan langsung muncul di Kitchen Display dapur.",
          "Pinjam stik tambahan → +Aksesoris (dihitung per jam sejak ditambahkan).",
          "Tambah waktu → Add Time. Pindah bilik → Pindah Unit (tagihan dan waktu ikut pindah).",
          "Pantau semua unit sekaligus lewat Live Billing Board di layar kedua.",
        ],
      },
      {
        title: "4. Selesai — pembayaran",
        steps: [
          "Tekan \"End Session & Bayar\". Tagihan akhir (sewa + aksesoris + makanan) muncul otomatis.",
          "Beri diskon/voucher bila ada, pilih metode pembayaran, tekan Bayar. Bisa dibayar sebagian tunai sebagian QRIS, atau disimpan sebagai \"bayar nanti\".",
          "Cetak struk.",
        ],
      },
      {
        title: "5. Setelah bayar — semuanya tercatat sendiri",
        steps: [
          "Pembukuan (jurnal) terbentuk otomatis dan bisa dilihat di Transaksi → Detail.",
          "Pembayaran tunai otomatis masuk hitungan kas shift yang sedang berjalan.",
          "Pelanggan member otomatis mendapat poin, dan tingkatannya bisa naik.",
          "Angka penjualan langsung muncul di Dashboard Ringkasan, Laporan, dan Laba Rugi.",
        ],
      },
      {
        title: "6. Akhir hari — tutup shift",
        steps: [
          "Kasir menghitung uang di laci per pecahan dan mencocokkan saldo aplikasi non-tunai, lalu menutup shift.",
          "Selisih (kalau ada) tampil setelah shift ditutup dan tersimpan di Riwayat Shift.",
        ],
      },
    ],
    notes: [
      "Untuk sewa yang DIBAWA PULANG pelanggan, alurnya berbeda — lihat topik Home Rental.",
      "Tidak ada yang perlu diinput dua kali: satu transaksi di Rental PS otomatis mengalir ke Kitchen, Shift, Transaksi, Laporan, dan Accounting.",
    ],
  },
];
