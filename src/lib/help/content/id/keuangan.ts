import type { HelpCategory } from "../../types";

export const KEUANGAN: HelpCategory[] = [
  {
    id: "accounting",
    group: "keuangan",
    label: "Accounting (Pembukuan & Laporan Keuangan)",
    summary:
      "Pembukuan lengkap yang terisi otomatis dari semua transaksi: daftar akun, jurnal, piutang & hutang, Laba Rugi, Neraca, Arus Kas, pemeriksaan otomatis, tutup buku bulanan, dan saldo awal. Kamu tidak perlu mengerti akuntansi untuk membaca laporan utamanya.",
    subsections: [
      {
        title: "Laporan yang paling sering dibuka",
        steps: [
          "Laba Rugi: pilih periode → lihat total pendapatan, laba kotor, dan laba bersih, beserta rincian per jenis pendapatan dan beban. Aktifkan \"Bandingkan Multi-Periode\" untuk membandingkan 2–4 bulan berdampingan.",
          "Neraca: posisi harta (kas, rekening, stok, aset), hutang, dan modal pada satu tanggal. Kosongkan tanggal untuk hari ini.",
          "Arus Kas: uang yang benar-benar masuk dan keluar dalam periode, per kategori dan per hari.",
          "Semua laporan bisa diunduh ke Excel/PDF dan setiap angkanya bisa diklik untuk melihat transaksi penyusunnya.",
        ],
      },
      {
        title: "Piutang (AR) & Hutang (AP)",
        steps: [
          "Piutang: tagihan pelanggan yang belum lunas, dikelompokkan menurut lamanya (belum jatuh tempo, 1–30, 31–60, >60 hari). Tekan \"Terima Bayar\" saat pelanggan melunasi.",
          "Hutang: tagihan supplier, pengeluaran yang dicatat hutang, dan hutang pembelian aset. Tekan Bayar, pilih akun kas/bank.",
        ],
      },
      {
        title: "Daftar akun (Chart of Accounts) & Account Mapping",
        steps: [
          "Daftar akun sudah disiapkan otomatis. Tambah akun baru hanya bila perlu (kode, nama, jenis, akun induk).",
          "Akun yang pernah dipakai tidak bisa dihapus — otomatis diarsipkan supaya riwayat tetap benar.",
          "Account Mapping menentukan akun tujuan otomatis per jenis transaksi (mis. sewa PS5 → Pendapatan Rental). Ubah hanya kalau paham akuntansi.",
        ],
      },
      {
        title: "Jurnal & Neraca Saldo",
        steps: [
          "Jurnal: semua catatan pembukuan, bisa disaring menurut sumbernya (Rental, POS, Expense, Aset, dll).",
          "Jurnal Manual (khusus pemegang izin): isi tanggal, keterangan, dan baris debit/kredit — total debit harus sama dengan kredit.",
          "Membatalkan jurnal manual membuat jurnal pembalik; jurnal asli tidak dihapus. Jurnal otomatis dibatalkan lewat menu asalnya (mis. refund di Transaksi).",
          "Neraca Saldo: saldo setiap akun dalam periode. Untuk saldo sejak awal, pilih Custom dan kosongkan kedua tanggal. Harus selalu \"Balance\".",
        ],
      },
      {
        title: "Rekonsiliasi, Audit, CALK",
        steps: [
          "Rekonsiliasi: membandingkan transaksi (tanggal transaksi) dengan jurnal (tanggal pencatatan) dan menunjukkan order yang tanggalnya berbeda atau bermasalah, beserta panduan penyelesaiannya — tanpa perlu edit manual.",
          "Audit: pemeriksaan pembukuan otomatis (mis. produk tanpa harga modal, jurnal ganda, data antar-outlet). Perbaikan yang disarankan selalu lewat konfirmasi dan dicatat sebagai jurnal koreksi.",
          "CALK (SAK EMKM): Catatan atas Laporan Keuangan untuk usaha kecil, siap dilengkapi dan dicetak.",
        ],
      },
      {
        title: "Tutup Periode (kunci bulan)",
        steps: [
          "Setelah laporan sebuah bulan final, pilih bulan itu dan tekan Tutup Periode (catatan opsional).",
          "Setelah ditutup, tidak ada jurnal baru — otomatis maupun manual — yang bisa dicatat dengan tanggal di bulan itu, sehingga laporan yang sudah diserahkan tidak berubah lagi.",
          "Koreksi setelah periode ditutup dicatat dengan tanggal hari ini. Buka kembali periode hanya bila benar-benar perlu.",
        ],
      },
      {
        title: "Migrasi Data (saldo awal & data lama)",
        navHint: "Tab ini hanya terlihat untuk Owner/Superuser.",
        steps: [
          "Saldo Awal: catat saldo pembukaan semua akun (kas, rekening, piutang, hutang, aset, modal) per tanggal mulai memakai NEXBILL. Tekan \"Muat Semua Akun Postable\" untuk mengisi daftar akun. Hanya boleh ada satu Saldo Awal aktif.",
          "Impor Data Historis: unduh template (Penjualan, Pembelian, Pendapatan Lain-lain, Pengeluaran), isi, upload — supaya tren laporan bulan-bulan sebelumnya ikut terlihat.",
          "Aset yang sudah dimiliki lebih mudah dimasukkan lewat Aset → Upload Excel dengan pilihan Saldo awal.",
        ],
        notes: ["Data historis yang diimpor masuk pembukuan dan laporan, tapi tidak muncul di daftar Transaksi/Expense."],
      },
    ],
    notes: [
      "Semua staf bisa MELIHAT halaman ini. Mengubah daftar akun & mapping: Owner, Superuser, Accountant. Jurnal manual & saldo awal: Owner, Superuser, Accountant. Manager hanya melihat.",
      "Isi Harga Modal setiap produk — tanpa itu Laba Rugi terlalu tinggi. Halaman Laba Rugi memberi peringatan kalau ada penjualan dengan harga modal kosong.",
    ],
  },
  {
    id: "expenses",
    group: "keuangan",
    label: "Expense Management (Pengeluaran)",
    summary:
      "Catat semua pengeluaran outlet (listrik, gaji, sewa, bahan, parkir, dll) beserta buktinya. Pengeluaran kecil disetujui otomatis; yang besar menunggu persetujuan Owner/Manager. Semua masuk pembukuan otomatis.",
    subsections: [
      {
        title: "Mencatat pengeluaran",
        steps: [
          "Tekan \"+ Expense Baru\": pilih akun beban (mis. Beban Listrik), kategori, keterangan, penerima/supplier (opsional), jumlah dan nominal, pajak (opsional).",
          "Pilih cara bayar: akun kas/bank yang dipakai, atau centang \"Catat sebagai hutang\" dan isi jatuh temponya.",
          "Lampirkan foto nota/struk sebagai bukti.",
          "Tekan Simpan & Submit. Di bawah batas persetujuan (bawaan Rp500.000) langsung disetujui; di atasnya berstatus Pending Approval.",
          "Tombol simpan terkunci selama diproses, jadi klik dua kali tidak membuat pengeluaran ganda.",
        ],
      },
      {
        title: "Persetujuan, pembayaran, pembatalan",
        steps: [
          "Owner/Manager menekan Setujui atau Tolak (dengan alasan) pada pengeluaran yang menunggu.",
          "Pengeluaran yang dicatat hutang, setelah disetujui, punya tombol Bayar untuk melunasinya.",
          "Draf/pending bisa dibatalkan tanpa bekas. Yang sudah disetujui/dibayar dibatalkan lewat Void (wajib alasan) — pembukuannya dibalik, datanya tidak dihapus.",
        ],
      },
      {
        title: "Cash Out Cepat",
        steps: ["Form singkat 3 kolom (kategori, nominal, catatan) untuk pengeluaran kecil harian dari laci, seperti parkir dan galon. Tetap mengikuti batas persetujuan."],
      },
      {
        title: "Recurring (pengeluaran rutin)",
        steps: [
          "Buat template untuk biaya yang berulang: nama, akun, nominal, frekuensi (bulanan/mingguan/tahunan), tanggal jatuh tempo berikutnya.",
          "Tekan \"Generate Expense yang Jatuh Tempo\" untuk membuat draf pengeluaran yang sudah waktunya, lalu Submit seperti biasa.",
        ],
      },
      {
        title: "Cost Center & Dashboard",
        steps: [
          "Cost Center membagi biaya per bagian (Rental, F&B, Dapur, Administrasi) supaya terlihat bagian mana yang paling boros.",
          "Tab Dashboard: pengeluaran hari ini/bulan ini, yang belum dibayar, menunggu persetujuan, jatuh tempo ≤3 hari, rincian per kategori, dan tren 30 hari.",
        ],
      },
    ],
    roles: "Mencatat & membayar: Owner, Superuser, Manager, Accountant, Cashier. Menyetujui: Owner, Superuser, Manager. Void: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "other-income",
    group: "keuangan",
    label: "Pendapatan Lain-lain",
    summary:
      "Catat uang masuk di luar penjualan rental, kasir, dan PPOB — misalnya komisi, sewa tempat untuk turnamen, sponsor, penjualan barang bekas, denda dari pelanggan, bunga atau cashback bank.",
    steps: [
      "Pilih rentang tanggal (atau tekan Hari Ini / Bulan Ini) untuk melihat daftarnya.",
      "Isi kategori, keterangan, diterima dari (opsional), nominal, dan metode pembayaran, lalu tekan Simpan.",
      "Langsung tercatat di pembukuan tanpa persetujuan. Kalau tunai dan ada shift terbuka, ikut masuk hitungan kas shift.",
      "Salah catat? Tekan Void dan isi alasannya.",
    ],
    roles: "Mencatat/void: Owner, Superuser, Manager, Accountant. Peran lain dengan izin laporan hanya bisa melihat.",
  },
  {
    id: "payments-methods",
    group: "keuangan",
    label: "Metode Pembayaran (QRIS, Transfer, E-wallet)",
    navHint: "Menu \"Pembayaran\" di sidebar.",
    summary:
      "Atur pilihan pembayaran yang muncul di kasir, rental, Home Rental, dan membership — termasuk gambar QRIS dan rekening bank outlet yang ditunjukkan ke pelanggan.",
    steps: [
      "Tekan \"+ Metode\", isi nama (mis. QRIS, BCA Transfer, GoPay), dan pilih jenisnya:",
      "\"Saldo Terlacak\" — untuk e-wallet/saldo yang harus dicek di aplikasinya saat tutup shift. \"Info Saja\" — untuk yang langsung masuk rekening/EDC tanpa perlu dicek per shift.",
      "Unggah gambar QRIS statis outlet dan/atau isi nomor & nama rekening bank. Saat kasir memilih metode ini, pelanggan langsung melihat ke mana harus membayar.",
      "Edit untuk mengubah nama/jenis/status aktif. Hapus hanya menyembunyikan metode dari transaksi baru; transaksi lama tidak berubah.",
    ],
    notes: [
      "Uang pelanggan selalu masuk langsung ke rekening/QRIS outlet — tidak pernah lewat NEXBILL.",
      "Metode Tunai tidak bisa dihapus karena dipakai untuk hitungan kas shift.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "reports",
    group: "keuangan",
    label: "Laporan (Operasional & Kesehatan Keuangan)",
    summary:
      "Laporan operasional per rentang tanggal yang mudah dibaca: penjualan, rental, Home Rental, stok & harga modal, pelanggan, pengeluaran, dan skor kesehatan keuangan. Laporan keuangan resmi (Laba Rugi, Neraca, Arus Kas) ada di menu Accounting.",
    subsections: [
      { title: "Penjualan", steps: ["Total pendapatan (rental vs kasir), jumlah transaksi lunas, tren harian, pendapatan per metode pembayaran, total diskon/pajak/service charge. Ada pembanding dengan Laba Rugi periode yang sama."] },
      { title: "Rental", steps: ["Pendapatan rental, jumlah sesi, rata-rata lama main, dan tabel per unit PS (sesi, durasi rata-rata, pendapatan)."] },
      { title: "Home Rental", steps: ["Pendapatan sewa bawa pulang, denda, ganti rugi, rincian per kategori dan jenis produk, serta status deposit."] },
      { title: "Inventori & HPP", steps: ["Pendapatan produk, total harga modal, margin per produk, daftar barang rusak/terbuang, dan stok menipis."] },
      { title: "Pelanggan", steps: ["Jumlah pelanggan, sebaran tingkatan member, dan pelanggan dengan belanja terbesar."] },
      { title: "Beban", steps: ["Total pengeluaran vs pendapatan, rasio pengeluaran, laba bersih, tren, dan rincian per kategori/akun/supplier/metode/cabang/cost center."] },
      {
        title: "Kesehatan Keuangan",
        steps: [
          "Ringkasan sehat/tidaknya usaha dalam bahasa sederhana: Profitabilitas (seberapa untung), Likuiditas (cukup uang tunai untuk membayar kewajiban), dan Efisiensi Operasional (biaya dibanding pendapatan).",
          "Gunakan setiap akhir bulan bersama Laba Rugi.",
        ],
      },
    ],
    notes: [
      "Setiap tab punya pilihan tanggal sendiri.",
      "Unduhan Excel/PDF untuk laporan keuangan resmi tersedia di menu Accounting.",
    ],
  },
];
