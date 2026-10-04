import type { HelpCategory } from "../../types";

export const SISTEM: HelpCategory[] = [
  {
    id: "staff",
    group: "sistem",
    label: "Staf & Hak Akses",
    summary:
      "Kelola akun staf dan perannya, proses permintaan persetujuan (void/refund), lihat jejak aktivitas, atur keamanan login, dan (khusus Superuser) atur izin per peran.",
    subsections: [
      {
        title: "Daftar staf",
        steps: [
          "Tambah Staf: nama, email, password, dan peran (Manager, Accountant, Supervisor, Cashier, Kitchen, atau Owner).",
          "Ubah peran langsung dari pilihan di tabel. Nonaktifkan akun staf yang berhenti — datanya tetap tersimpan.",
          "Hanya Owner/Superuser yang bisa menjadikan staf lain sebagai Owner.",
        ],
      },
      {
        title: "Keamanan login: satu akun = satu perangkat",
        steps: [
          "Kalau aturan ini aktif (bawaan), akun yang sedang dipakai di satu browser tidak bisa login di browser/PC lain sampai: logout, 30 menit tidak dipakai, atau dikeluarkan.",
          "Staf lupa logout di komputer lain? Tekan \"Keluarkan\" pada akunnya di daftar staf.",
          "Aturan bisa dimatikan per outlet (tidak disarankan).",
        ],
      },
      {
        title: "Approval (persetujuan)",
        steps: [
          "Ajukan Void/Batalkan Order: masukkan nomor order dan alasan. Kalau peranmu berhak, langsung dijalankan; kalau tidak, masuk antrean.",
          "Daftar Permintaan: pemegang izin menyetujui atau menolak.",
          "Shift yang ditandai (selisih besar atau banyak void) juga ditinjau dari sini.",
        ],
      },
      { title: "Audit Log", steps: ["Catatan kronologis semua aktivitas penting: siapa, kapan, melakukan apa. Hanya untuk dilihat."] },
      {
        title: "Role & Izin",
        navHint: "Hanya terlihat untuk akun Superuser.",
        steps: [
          "Tabel izin: baris = izin, kolom = peran. Centang/hapus centang untuk mengubah hak akses peran itu — berlaku seketika.",
          "Tekan \"reset\" untuk mengembalikan peran ke pengaturan bawaan.",
        ],
      },
    ],
    notes: [
      "Setiap orang sebaiknya punya akun sendiri. Berbagi akun membuat selisih kas dan kesalahan tidak bisa ditelusuri.",
      "Menghapus akun staf secara permanen hanya bisa oleh Superuser; untuk staf yang berhenti cukup dinonaktifkan.",
    ],
  },
  {
    id: "settings",
    group: "sistem",
    label: "Pengaturan Outlet",
    summary:
      "Semua pengaturan outlet dalam satu halaman bertab: profil usaha & pajak, preferensi, cabang, satuan, kategori produk, durasi rental, banner iklan, TV Screensaver, notifikasi, modul fitur, audit log, dan akun saya.",
    subsections: [
      {
        title: "Business & Tax",
        steps: [
          "Profil usaha: nama, logo, telepon, alamat, Negara (menentukan mata uang dan bahasa balasan Customer Service), nama & password WiFi.",
          "Pajak & Billing: pajak, service charge, pembulatan tagihan ke Rp100/Rp500/Rp1.000 (selisihnya dicatat otomatis), dan batas persetujuan pengeluaran.",
          "Target Penjualan (BEP) bulanan — tampil sebagai target harian di Dashboard.",
          "Booking / Reservasi: jeda antar-booking, batas waktu check-in, minimal waktu pesan, terima booking online, dan tautan halaman booking outlet.",
          "Integrasi Tuya Cloud API (untuk smart plug Tuya), Footer Struk, Printer, dan Rekening Bank untuk pencairan komisi referral.",
        ],
      },
      {
        title: "Preferensi",
        steps: [
          "Mata uang (mengikuti Negara), periode akuntansi (awal tahun buku, bulanan/kuartalan/tahunan), format angka dan tanggal.",
          "Komposisi Modal Awal Shift: akun kas mana yang dijumlahkan sebagai saran modal awal.",
          "Ambang Batas Anti-Fraud Shift: batas selisih kas dan jumlah void/refund per shift yang otomatis ditandai; batas diskon manual kasir (%); izin beberapa laci kasir terbuka bersamaan.",
        ],
      },
      {
        title: "Cabang, Satuan, Kategori Produk, Durasi Rental",
        steps: [
          "Cabang: tambah cabang baru dan tekan \"Pakai Cabang Ini\" untuk berpindah outlet aktif.",
          "Satuan: pcs, gram, kg, liter, dll — dipakai di produk, resep, dan pembelian.",
          "Kategori Produk: kelompok produk di kasir dan laporan.",
          "Durasi Rental: pilihan durasi cepat saat memulai sesi (mis. 30, 60, 90, 120 menit).",
        ],
      },
      {
        title: "Banner Iklan, TV Screensaver, Notifikasi",
        steps: [
          "Banner Iklan: gambar promosi (disarankan minimal 1600×500 px) untuk halaman booking online — atur urutan, tautan, aktif/nonaktif.",
          "TV Screensaver: tampilan layar promosi di TV Android bilik — lihat topik TV Screensaver.",
          "Notifikasi: pilih pengingat yang ditampilkan (stok menipis, pengeluaran menunggu persetujuan, selisih kas, booking). Maintenance Prediktif Unit: batas jam pemakaian sebelum unit ditandai perlu servis.",
        ],
      },
      {
        title: "Feature Management",
        navHint: "Hanya bisa diubah Superuser.",
        steps: [
          "Nyalakan/matikan modul: Home Rental (dan sub-fiturnya), PPOB, TV Screensaver.",
          "Mematikan modul tidak menghapus data — riwayat muncul lagi saat modul dinyalakan.",
          "Sub-fitur berlabel \"Segera\" belum tersedia.",
        ],
      },
      {
        title: "Akun Saya",
        steps: [
          "Ganti email login dan password akunmu sendiri (password minimal 8 karakter).",
          "Akun yang dibuat lewat Google bisa membuat password supaya juga bisa login dengan email & password.",
          "Notifikasi di HP: tekan \"Aktifkan Notifikasi di Perangkat Ini\" di setiap HP yang dipakai, izinkan notifikasi, lalu pilih jenisnya (sesi hampir habis, permintaan QR pelanggan, booking, pembayaran QRIS, shift berisiko, stok menipis, ringkasan tutup shift). \"Kirim Notifikasi Uji\" untuk mengecek.",
          "Owner: kartu \"Hapus Akun & Data\" menghapus akun beserta data outlet — tekan \"Kirim Kode Konfirmasi\", masukkan kode dari email, ketik HAPUS. Akun & outlet langsung nonaktif, data pribadi dihapus paling lambat 30 hari.",
        ],
      },
    ],
    notes: [
      "Mengubah sebagian besar pengaturan butuh peran Owner, Superuser, atau Manager; staf lain hanya bisa melihat.",
      "Pengaturan printer tersimpan per komputer — atur di setiap komputer kasir.",
      "Hapus Semua Data (reset total) ada di menu Admin Data.",
    ],
  },
  {
    id: "semua-outlet",
    group: "sistem",
    label: "Semua Outlet (Multi-Cabang)",
    navHint: "Menu ini hanya muncul untuk akun yang terhubung ke lebih dari satu outlet.",
    summary: "Ringkasan semua cabang dalam satu layar dan tempat mengelola cabang: tambah, ubah profil, nonaktifkan, dan pindah ke dashboard cabang mana pun.",
    steps: [
      "Kartu atas: total omzet hari ini dari semua outlet aktif.",
      "Setiap outlet tampil sebagai kartu: status langganan, omzet hari ini, ketersediaan unit PS.",
      "Tekan \"Buka Dashboard Outlet Ini\" untuk berpindah — semua menu lain langsung mengikuti outlet itu.",
      "Owner/Superuser: \"Tambah Outlet\" untuk cabang baru (daftar akun pembukuan otomatis dibuat), ikon pensil untuk mengubah profil, ikon arsip untuk menonaktifkan.",
      "Outlet yang dinonaktifkan pindah ke bagian Arsip dan bisa diaktifkan kembali kapan saja.",
    ],
    notes: [
      "Menonaktifkan = mengarsipkan, bukan menghapus. Semua riwayat tetap aman.",
      "Outlet utama akunmu tidak bisa dinonaktifkan dari sini.",
    ],
  },
  {
    id: "billing-subscription",
    group: "sistem",
    label: "Langganan NEXBILL",
    navHint: "Menu \"Langganan\" — ini tagihan outletmu KE NEXBILL, bukan pendapatan outlet.",
    summary: "Status langganan aplikasi, pilihan paket (Starter per unit PS atau Pro per outlet, bulanan/tahunan), pembayaran tagihan, pembelian perangkat (smart plug, jasa instalasi), dan AI Add-on.",
    steps: [
      "Lihat status: Masa Percobaan (30 hari), Aktif, Menunggu Pembayaran, Masa Tenggang, atau Ditangguhkan.",
      "Pilih paket saat berlangganan: Starter (per unit PS aktif, minimal 5 unit, fitur operasional) atau Pro (flat per outlet, unit tak terbatas, semua fitur + AI). Siklus Tahunan = bayar 10 bulan, aktif 12 bulan.",
      "Bayar tagihan: pilih QRIS, Virtual Account bank, atau metode lain yang tersedia. Setelah membayar, tekan \"Tandai Lunas\" bila diminta.",
      "\"Ganti Paket\": naik ke Pro atau tambah kuota unit Starter langsung berlaku setelah selisih prorata dibayar; turun paket, kurangi kuota, atau ganti siklus berlaku di perpanjangan berikutnya. \"Perpanjang Sekarang\" membuat tagihan periode berikutnya lebih awal.",
      "Belanja perangkat: pilih smart plug atau jasa instalasi, atur jumlah, checkout — muncul dalam satu tagihan.",
      "AI: gratis selama percobaan dan sudah termasuk paket Pro; di paket Starter diaktifkan sebagai AI Add-on dengan biaya bulanan.",
    ],
    notes: [
      "Selama masa percobaan semua fitur Pro terbuka, tetapi smart plug belum bisa ditambahkan dan kontrol Android TV dibatasi 1 unit.",
      "Paket Starter mengunci Akuntansi, Pengeluaran, Pendapatan Lain, Aset, PPOB, Rental ke Rumah, deteksi anti-fraud shift, dan pembuatan cabang baru (ditandai PRO di menu) — datanya tetap tersimpan dan langsung terbuka saat upgrade. Jumlah unit PS aktif dibatasi sesuai kuota.",
      "Tagihan yang lewat jatuh tempo masuk Masa Tenggang 7 hari; setelah itu akses ditangguhkan kecuali halaman Langganan. Pengingat tampil setiap hari selama masa tenggang.",
      "Outlet dalam satu grup tagihan (multi-cabang) ditagih dalam satu invoice; outlet Pro ke-2 dan seterusnya mendapat diskon cabang.",
      "Pembayaran di sini adalah biaya ke NEXBILL dan tidak pernah tercatat sebagai pendapatan outletmu.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "referral",
    group: "sistem",
    label: "Program Referral (Ajak Outlet Lain)",
    summary:
      "Ajak pemilik rental lain memakai NEXBILL dengan kode/tautan outletmu. Mereka mendapat diskon 20% di pembayaran pertama; kamu mendapat komisi setiap kali mereka membayar langganan selama langganannya aktif.",
    steps: [
      "Salin tautan referral outletmu (\"?ref=KODE\") dan bagikan. Kode dibuat otomatis untuk setiap outlet.",
      "Setiap kali outlet yang kamu ajak membayar langganan, komisi (bawaan 20%) otomatis tercatat.",
      "Kartu ringkasan: total komisi dan saldo yang belum dicairkan. Di bawahnya: riwayat pencairan dan daftar outlet yang kamu ajak.",
      "Isi rekening bank di Pengaturan → Business & Tax. Komisi dicairkan manual oleh tim NEXBILL setiap Senin.",
    ],
    notes: [
      "Komisi hanya dari pembayaran langganan NEXBILL outlet yang diajak, bukan dari omzet mereka. Berhenti otomatis kalau mereka berhenti berlangganan.",
      "Tingkat Affiliate (27%) dan Master Partner (35%) diberikan tim NEXBILL untuk mitra yang aktif mengajak banyak outlet.",
    ],
  },
  {
    id: "rekomendasi-produk",
    group: "sistem",
    label: "Rekomendasi Produk (Belanja Perlengkapan)",
    navHint: "Tautan dari halaman Langganan, dan dari peringatan smart plug di Kontrol Perangkat.",
    summary:
      "Katalog perlengkapan rental pilihan tim NEXBILL (stik, aksesoris, kabel, jaringan, smart plug, dll) dengan tautan langsung ke toko online. Pembelian dilakukan di toko tujuan, di luar NEXBILL.",
    steps: [
      "Pilih kategori, klik produk untuk membuka halaman tokonya di tab baru.",
      "Dibuka dari peringatan TV non-Android di Kontrol Perangkat, halaman ini langsung menyaring produk smart plug. Tekan \"Lihat semua produk rekomendasi\" untuk melihat semuanya.",
      "Selalu cek harga akhir di halaman toko — harga di katalog hanya referensi.",
    ],
    notes: ["Pembelian di sini tidak masuk tagihan Langganan maupun pembukuan outlet secara otomatis. Catat sebagai pembelian aset atau pengeluaran kalau perlu."],
  },
  {
    id: "ai",
    group: "sistem",
    label: "AI Business Intelligence (Tanya Data Usaha)",
    summary:
      "Tanya apa saja tentang usahamu dalam bahasa sehari-hari — AI membaca data outletmu (penjualan, rental, biaya, laba rugi, kas, stok, aset) dan menjawab. Ada juga panel analisa otomatis.",
    subsections: [
      {
        title: "Asisten Bisnis",
        steps: [
          "Ketik pertanyaan, mis. \"Berapa pendapatan bulan ini dibanding bulan lalu?\" atau \"Unit PS mana yang paling menguntungkan?\", atau klik salah satu contoh pertanyaan.",
          "Saat berpikir, AI menampilkan data yang sedang dicek. Jawaban memakai angka outletmu yang terbaru.",
        ],
      },
      {
        title: "Insight & Analisa",
        steps: [
          "Tren 30 hari pendapatan & biaya, perkiraan 7 hari ke depan, dan deteksi angka yang tidak wajar — dihitung otomatis tanpa biaya.",
          "Tekan \"Generate Rekomendasi\" untuk meminta saran tertulis dari AI.",
        ],
      },
    ],
    notes: [
      "Hanya untuk Owner dan Superuser.",
      "Gratis selama masa percobaan dan termasuk paket Pro; di paket Starter butuh AI Add-on di menu Langganan.",
      "Periksa kembali angka penting di laporan sebelum mengambil keputusan besar.",
    ],
  },
  {
    id: "admin",
    group: "sistem",
    label: "Admin Data & Reset Data",
    navHint: "Panel tabel khusus Superuser. Bagian Hapus Semua Data juga bisa diakses Owner.",
    summary:
      "Jalan pintas untuk memperbaiki data master (produk, pelanggan, supplier, staf, unit, voucher, akun kas/bank, dll) secara langsung, dan fitur Reset Data untuk menghapus semua data outlet. Gunakan dengan sangat hati-hati.",
    steps: [
      "Pilih tabel, tekan Tambah/Edit pada baris, isi, lalu Simpan.",
      "Hapus: pada tabel yang punya status aktif (produk, staf, unit, voucher, dll) hanya menonaktifkan; tabel lain terhapus permanen dan gagal bila masih dipakai data lain.",
      "Hapus Semua Data (Reset Total) — khusus outlet ini: ketik ulang frasa konfirmasi, masukkan password, lalu tekan tombol hapus.",
      "Reset menghapus PERMANEN semua transaksi, pembukuan, produk, stok, pelanggan, pengeluaran, aset, dan pengaturan outlet ini. Yang tersisa hanya data outlet dan akun Superuser/Owner.",
    ],
    notes: [
      "Data transaksi (order, pembayaran, jurnal, mutasi stok, audit log) sengaja tidak bisa diubah dari sini supaya riwayat tetap jujur.",
      "Reset tidak bisa dibatalkan dari aplikasi. Hubungi Customer Service sebelum melakukannya kalau ragu.",
    ],
  },
];
