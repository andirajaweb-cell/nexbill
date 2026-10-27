/**
 * Jawaban Bot bawaan NEXBILL — basis tanya-jawab lengkap untuk bot support 24 jam (Customer Service &
 * Telegram): instalasi, setup, pemakaian harian, dan masalah yang sering terjadi. Disusun dari Pusat
 * Bantuan (lib/help/content), panduan NEXBILL TV (android-tv/README.md, RISIKO.md), dan fitur yang
 * sudah ada di aplikasi. Ditulis umum — tanpa data outlet tertentu.
 *
 * Cara kerja (lib/support-bot/knowledge.ts): bot SELALU bisa memakai jawaban ini. Bila admin mengimpor
 * jawaban ke Platform Admin › Jawaban Bot (tag "starter:<key>") lalu mengubah/menonaktifkannya, versi di
 * database yang dipakai. Menambah jawaban baru: tambahkan entri dengan `key` unik (jangan ganti key lama).
 */

export interface StarterAnswer {
  key: string;
  topic: string;
  question: string;
  answer: string;
}

export const STARTER_TOPICS = [
  "Akun & login",
  "Langganan & paket",
  "Setup outlet baru",
  "Rental PS (sesi)",
  "Booking",
  "Kasir & pembayaran",
  "Shift & kas",
  "Member, promo & voucher",
  "Stok & inventori",
  "Laporan & pembukuan",
  "NEXBILL TV — instalasi",
  "NEXBILL TV — pemakaian",
  "NEXBILL TV — masalah",
  "Kontrol perangkat (Agent & smart plug)",
  "Internet putus / Mode Offline",
  "Printer & struk",
  "Bantuan & Telegram",
] as const;

export const STARTER_ANSWERS: StarterAnswer[] = [
  /* ------------------------------------------------------------- Akun & login ------------------------------------------------------------- */
  {
    key: "login-perangkat-lain",
    topic: "Akun & login",
    question: "Tidak bisa login: \"akun sedang aktif di perangkat lain\"",
    answer:
      "Satu akun hanya boleh aktif di satu perangkat/browser. Pilih salah satu:\n1. Logout dulu dari perangkat sebelumnya (menu akun kanan atas → Keluar).\n2. Tunggu 30 menit tanpa memakai akun itu.\n3. Minta Owner membuka Staf & Hak Akses → tekan \"Keluarkan\" pada akun tersebut.\nSetiap staf sebaiknya punya akun sendiri supaya tidak saling mengeluarkan.",
  },
  {
    key: "lupa-password",
    topic: "Akun & login",
    question: "Lupa password / tidak menerima email reset",
    answer:
      "1. Di halaman login dashboard.nexbill.id tekan \"Lupa password\" dan masukkan email akun.\n2. Buka tautan di email — cek juga folder Spam/Promosi.\n3. Akun yang dibuat dengan Google cukup tekan tombol Google, tidak perlu password.\nMasih tidak masuk email setelah 10 menit? Pastikan alamat email benar, lalu kirim tiket di Customer Service.",
  },
  {
    key: "akun-nonaktif",
    topic: "Akun & login",
    question: "Akun staf tidak bisa masuk / dinonaktifkan",
    answer:
      "Akun yang dinonaktifkan tidak bisa login. Owner/Manager mengaktifkannya kembali di Staf & Hak Akses. Staf yang berhenti cukup dinonaktifkan (datanya tetap tersimpan); hapus permanen hanya bisa oleh Superuser.",
  },
  {
    key: "tambah-staf",
    topic: "Akun & login",
    question: "Cara menambah staf dan mengatur perannya",
    answer:
      "Buka Staf & Hak Akses → Tambah Staf: isi nama, email, password, dan peran (Manager, Accountant, Supervisor, Cashier, Kitchen, atau Owner). Peran menentukan tombol apa yang muncul — kasir bisa membuka banyak halaman tapi tidak bisa mengubah data tertentu, itu disengaja. Izin per peran hanya bisa diubah Superuser di tab Role & Izin.",
  },
  {
    key: "tombol-tidak-ada",
    topic: "Akun & login",
    question: "Tombol yang dicari tidak muncul (hapus, edit, dll)",
    answer:
      "Biasanya karena peran akunmu tidak punya izin (hapus permanen, tukar poin, dan pengaturan izin hanya untuk Superuser), atau modulnya dimatikan di Pengaturan → Feature Management (Superuser). Fitur bertanda PRO terkunci di paket Starter. Masih ragu? Kirim tangkapan layar ke Customer Service.",
  },
  {
    key: "ganti-bahasa",
    topic: "Akun & login",
    question: "Cara mengganti bahasa dashboard",
    answer:
      "Pakai pilihan bahasa di bar atas dashboard: Indonesia, English, Melayu, ไทย, Filipino, atau Tiếng Việt. Pusat Bantuan ikut berganti bahasa. Bahasa balasan tim Customer Service mengikuti Negara outlet di Pengaturan → Business & Tax.",
  },

  /* ------------------------------------------------------------- Langganan ------------------------------------------------------------- */
  {
    key: "masa-percobaan",
    topic: "Langganan & paket",
    question: "Berapa lama masa percobaan dan apa batasannya?",
    answer:
      "Masa percobaan 30 hari dengan semua fitur Pro terbuka. Batasannya: smart plug belum bisa ditambahkan dan kontrol Android TV lewat Relay Agent dibatasi 1 unit. Status langganan terlihat di menu Langganan.",
  },
  {
    key: "starter-vs-pro",
    topic: "Langganan & paket",
    question: "Beda paket Starter dan Pro",
    answer:
      "Starter: dihitung per unit PS aktif (minimal 5 unit), berisi fitur operasional (rental, kasir, booking, member, shift, laporan penjualan, Pengeluaran & Laba Rugi ringkas). Pro: tarif tetap per outlet, unit tak terbatas, semua fitur termasuk akuntansi lengkap, aset, PPOB, anti-fraud shift, multi-cabang, dan AI. Harga terbaru ada di menu Langganan dan nexbill.id/#harga. Siklus tahunan = bayar 10 bulan, aktif 12 bulan.",
  },
  {
    key: "fitur-pro-terkunci",
    topic: "Langganan & paket",
    question: "Menu bertanda PRO tidak bisa dibuka",
    answer:
      "Di paket Starter, Akuntansi, Pengeluaran lanjutan, Pendapatan Lain, Aset, PPOB, Rental ke Rumah, anti-fraud shift, dan pembuatan cabang baru terkunci. Datanya tetap tersimpan dan langsung terbuka saat upgrade lewat Langganan → Ganti Paket (selisih prorata dibayar, berlaku seketika).",
  },
  {
    key: "bayar-langganan",
    topic: "Langganan & paket",
    question: "Cara membayar langganan NEXBILL",
    answer:
      "Menu Langganan → pilih tagihan → bayar lewat QRIS, Virtual Account bank, atau metode lain yang tersedia. Setelah membayar, tekan \"Tandai Lunas\" bila diminta. \"Perpanjang Sekarang\" membuat tagihan periode berikutnya lebih awal. Pembayaran langganan tidak pernah tercatat sebagai pendapatan outlet.",
  },
  {
    key: "masa-tenggang",
    topic: "Langganan & paket",
    question: "Langganan lewat jatuh tempo / akses ditangguhkan",
    answer:
      "Tagihan yang lewat jatuh tempo masuk Masa Tenggang 7 hari (pengingat tampil setiap hari). Setelah itu akses ditangguhkan kecuali halaman Langganan — data tetap aman. Bayar tagihan di menu Langganan dan akses kembali normal. Ini masalah tagihan: bot akan meneruskannya ke tim bila perlu dicek manual.",
  },

  /* ------------------------------------------------------------- Setup outlet ------------------------------------------------------------- */
  {
    key: "urutan-setup",
    topic: "Setup outlet baru",
    question: "Urutan setup outlet baru dari nol",
    answer:
      "1. Pengaturan → Business & Tax: nama, logo, alamat, Negara, pajak/service charge, pembulatan, footer struk.\n2. Rental PS → Kelola Unit: tambah tiap unit (nama, konsol PS2–PS5/Driving Simulator, jenis TV, tarif per jam).\n3. Menu Pembayaran: tambah QRIS/transfer yang dipakai.\n4. Staf & Hak Akses: buat akun tiap staf.\n5. (Opsional) Kontrol Perangkat / NEXBILL TV untuk TV otomatis.\n6. Printer struk di Pengaturan → Printer.\n7. Buka shift lalu lakukan 1 transaksi uji coba, kemudian void.\nPanduan lengkap: Pusat Bantuan → Cara Setup Outlet Baru.",
  },
  {
    key: "tambah-unit-tarif",
    topic: "Setup outlet baru",
    question: "Cara menambah unit PS dan mengatur tarif",
    answer:
      "Rental PS → tombol \"Kelola Unit\": isi nama unit (mis. \"PS5 - Bilik 1\"), jenis konsol (PS2, PS3, PS4, PS4 Pro, PS5, PS5 Slim, dst.), jenis TV (Android TV / smart TV / analog), dan tarif per jam. Tarif Rp0 akan ditanyakan saat mulai sesi. Paket harga tetap dibuat di Promo & Paket; pilihan durasi cepat di Pengaturan → Durasi Rental.",
  },
  {
    key: "metode-pembayaran",
    topic: "Setup outlet baru",
    question: "Cara menambah QRIS / transfer bank",
    answer:
      "Menu Pembayaran: tunai sudah ada otomatis. Tambahkan metode non-tunai yang dipakai (QRIS, transfer, e-wallet, debit). Untuk QRIS/transfer, unggah gambar QRIS statis outlet dan isi rekening — ditampilkan ke pelanggan saat kasir memilih metode itu. Uang selalu masuk langsung ke rekening outlet, tidak lewat NEXBILL.",
  },
  {
    key: "saldo-awal",
    topic: "Setup outlet baru",
    question: "Outlet sudah berjalan sebelum pakai NEXBILL — saldo awal & aset lama",
    answer:
      "Isi saldo awal (kas, rekening, piutang, hutang, modal) per tanggal mulai di Accounting → Migrasi Data (paket Pro). Aset yang sudah dimiliki (PS, TV, kursi) masukkan di Aset → \"+ Aset Baru\" atau Upload Excel dengan pilihan \"Saldo awal\" — mencatat aset lama tidak membuat kas keluar. Outlet yang benar-benar baru boleh melewati langkah ini.",
  },
  {
    key: "feature-management",
    topic: "Setup outlet baru",
    question: "Menyalakan modul TV Screensaver, PPOB, Home Rental",
    answer:
      "Superuser membuka Pengaturan → Feature Management dan menyalakan modul yang dipakai. Modul yang tidak dipakai biarkan mati supaya menu staf ringkas. NEXBILL TV butuh modul TV Screensaver aktif.",
  },

  /* ------------------------------------------------------------- Rental PS ------------------------------------------------------------- */
  {
    key: "mulai-sesi",
    topic: "Rental PS (sesi)",
    question: "Cara memulai sesi rental",
    answer:
      "Rental PS → panel SESI BARU: pilih unit kosong → pilih Paket atau Per Jam (durasi tertentu atau Terbuka) → isi nama pelanggan atau pilih Member → (opsional) nama game dan DP → MULAI SESI. Kalau unit punya NEXBILL TV, layar game di TV langsung terbuka (biasanya < 1 detik).",
  },
  {
    key: "tambah-waktu-jeda",
    topic: "Rental PS (sesi)",
    question: "Tambah waktu, jeda, dan pindah unit",
    answer:
      "Di kartu sesi: Add Time (+10 s.d. +120 menit), Jeda/Lanjut (argo berhenti sementara — layar NEXBILL TV ikut terkunci \"DIJEDA\"), Pindah Unit (waktu dan tagihan ikut pindah, TV lama terkunci dan TV baru terbuka). Alarm berbunyi sekali saat sisa waktu 5 menit.",
  },
  {
    key: "akhiri-bayar",
    topic: "Rental PS (sesi)",
    question: "Mengakhiri sesi dan menerima pembayaran",
    answer:
      "Tekan \"End Session & Bayar\" → tagihan (sewa + aksesoris + F&B) tampil → isi diskon/voucher bila ada → pilih metode → Bayar. Bisa split (sebagian tunai, sebagian QRIS) atau \"Tutup (bayar nanti di POS)\". QRIS/transfer: tekan \"Tandai Diterima\" hanya setelah uang benar-benar masuk. Sesi berdurasi berhenti sendiri saat waktunya habis, tapi pembayarannya tetap diselesaikan kasir.",
  },
  {
    key: "fnb-saat-main",
    topic: "Rental PS (sesi)",
    question: "Pelanggan pesan makanan/minuman saat bermain",
    answer:
      "Tekan +F&B di kartu sesinya (bukan lewat Kasir) supaya masuk satu tagihan dan langsung tampil di Kitchen Display. Pelanggan juga bisa memesan sendiri lewat QR Pelanggan di bilik — pesanan baru masuk tagihan setelah kasir menekan \"Terima\".",
  },
  {
    key: "saldo-waktu-member",
    topic: "Rental PS (sesi)",
    question: "Paket berhenti lebih awal — sisa waktu member",
    answer:
      "Untuk member, sisa menit paket/durasi yang berhenti lebih awal bisa disimpan sebagai Saldo Waktu dan dipakai di kunjungan berikutnya (pilih opsi saldo waktu saat mulai sesi). Pemakaiannya tercatat otomatis di pembukuan.",
  },
  {
    key: "qr-pelanggan",
    topic: "Rental PS (sesi)",
    question: "QR Pelanggan di bilik — apakah pelanggan perlu aplikasi?",
    answer:
      "Tidak. Pelanggan cukup scan dengan kamera HP. Halamannya menampilkan sisa waktu & perkiraan tagihan, bisa pesan F&B, minta tambah waktu, atau panggil kasir. Semua permintaan masuk panel \"Permintaan Pelanggan\" di Rental PS dan baru berlaku setelah kasir menerimanya. Pasang: Rental PS → Kelola Unit → QR Pelanggan → Cetak stiker. QR bocor? Tekan \"Ganti QR\".",
  },
  {
    key: "set-maintenance-unit",
    topic: "Rental PS (sesi)",
    question: "Unit rusak — keluarkan dari penyewaan",
    answer:
      "Rental PS → Kelola Unit → Set Maintenance (tidak bisa saat unit sedang dipakai; hentikan sesi dulu). Buat tiket di menu Maintenance supaya biaya perbaikan tercatat. Stik bermasalah bisa dicek dulu dengan Dokter Stik (Maintenance → Gamepad Tester).",
  },
  {
    key: "live-billing-lobi",
    topic: "Rental PS (sesi)",
    question: "Layar pantau kasir dan papan lobi untuk pelanggan",
    answer:
      "Live Billing Board: buka di monitor kedua kasir, menampilkan semua sesi berjalan (hanya lihat). \"Papan lobi untuk pelanggan\" (unit kosong, sisa waktu, unit yang segera kosong, QR booking — tanpa nama pelanggan atau tagihan): ada di halaman Live Billing Board, tekan \"Buka papan\" atau salin tautannya lalu buka di TV/monitor lobi.",
  },

  /* ------------------------------------------------------------- Booking ------------------------------------------------------------- */
  {
    key: "booking-online",
    topic: "Booking",
    question: "Cara mengaktifkan booking online untuk pelanggan",
    answer:
      "Pengaturan → Business & Tax → Booking / Reservasi: aktifkan \"terima booking online\", atur jeda antar-booking, batas check-in, dan minimal waktu pesan, lalu salin tautan halaman booking (dashboard.nexbill.id/book/<outlet>). Bagikan di WhatsApp/Instagram/Google Maps. Pelanggan tidak perlu aplikasi. Booking baru memunculkan pop-up berbunyi di dashboard.",
  },
  {
    key: "halaman-booking-profil",
    topic: "Booking",
    question: "Menambah foto outlet, WhatsApp admin, petunjuk arah di halaman booking",
    answer:
      "Di halaman Booking ada bagian profil halaman booking: unggah foto outlet, tambah beberapa nomor WhatsApp admin (per cabang/per admin), dan titik lokasi atau link Google Maps untuk tombol petunjuk arah. Daftar cabang bisa ditampilkan atau disembunyikan.",
  },
  {
    key: "checkin-booking",
    topic: "Booking",
    question: "Check-in pelanggan yang sudah booking",
    answer:
      "Ketik kode booking (mis. BK-00001) di kotak pencarian halaman Booking lalu tekan Enter / \"Cari & Check-in\". Jadwal bentrok otomatis masuk Waiting List. Map Booking menampilkan satu baris per unit — klik blok kosong untuk langsung mengisi booking di jam itu.",
  },
  {
    key: "no-show-blacklist",
    topic: "Booking",
    question: "Pelanggan sering tidak datang (no-show)",
    answer:
      "Tandai booking sebagai No-show saat pelanggan tidak datang. Di halaman Booking ada pengaturan blokir no-show: nomor yang tidak datang beberapa kali dalam periode tertentu otomatis tidak bisa booking online. Owner bisa memblokir manual atau melepas blokir (pengampunan) per nomor WhatsApp.",
  },

  /* ------------------------------------------------------------- Kasir & pembayaran ------------------------------------------------------------- */
  {
    key: "jual-produk-pos",
    topic: "Kasir & pembayaran",
    question: "Menjual makanan/minuman ke pembeli yang tidak main",
    answer:
      "Kasir (POS): klik produk atau scan barcode (tombol \"Scan kamera\" bila tidak ada scanner) → atur jumlah → diskon/voucher bila ada → pilih metode → Bayar → Cetak Struk. Tunai: tekan \"Konfirmasi Cash Diterima\". Tagihan \"bayar nanti\" dari sesi rental tampil di Order Terbuka di bawah keranjang (bisa di-split atau digabung).",
  },
  {
    key: "qris-belum-masuk",
    topic: "Kasir & pembayaran",
    question: "Pembayaran QRIS/transfer belum terkonfirmasi",
    answer:
      "1. Cek aplikasi bank/QRIS outlet — pastikan dana benar-benar masuk (jangan hanya percaya foto bukti transfer).\n2. Setelah masuk, tekan \"Tandai Diterima\" dan isi nomor referensinya.\nUang tidak pernah lewat NEXBILL, jadi NEXBILL tidak bisa melihat mutasi rekening outlet.",
  },
  {
    key: "void-refund",
    topic: "Kasir & pembayaran",
    question: "Salah input transaksi — void atau refund",
    answer:
      "Transaksi → Detail → Void (batalkan transaksi keliru) atau Refund (kembalikan uang), alasan wajib. Kalau peranmu tidak berhak, permintaan masuk Staf & Hak Akses → Approval dan menunggu atasan. Transaksi tidak hilang — tetap tersimpan berstatus batal dan pembukuannya dibalik otomatis.",
  },
  {
    key: "diskon-dibatasi",
    topic: "Kasir & pembayaran",
    question: "Kasir tidak bisa memberi diskon besar",
    answer:
      "Diskon manual kasir dibatasi persentase yang diatur Owner di Pengaturan → Preferensi. Diskon di atas batas butuh Supervisor ke atas. Untuk promo rutin, buat Paket (Promo & Paket) atau Voucher (Membership & CRM).",
  },
  {
    key: "keranjang-hilang",
    topic: "Kasir & pembayaran",
    question: "Isi keranjang kasir hilang setelah pindah menu",
    answer:
      "Isi keranjang Kasir tersimpan di browser yang sama — pindah menu atau refresh tidak menghapusnya. Kalau hilang, kemungkinan memakai browser/perangkat lain atau data browser dibersihkan.",
  },

  /* ------------------------------------------------------------- Shift & kas ------------------------------------------------------------- */
  {
    key: "buka-tutup-shift",
    topic: "Shift & kas",
    question: "Cara buka dan tutup shift",
    answer:
      "Buka: Shift & Kasir → Buka Shift Baru → isi Modal Awal sesuai uang fisik di laci. Tutup: hitung uang per pecahan tanpa melihat angka sistem, isi saldo tiap e-wallet/deposit di Verifikasi Saldo Non-Tunai, isi uang yang ditinggal di laci, tulis catatan bila ada selisih → Tutup Shift. Ringkasan menampilkan ekspektasi kas dan selisih (merah = kurang).",
  },
  {
    key: "selisih-kas",
    topic: "Shift & kas",
    question: "Ada selisih kas saat tutup shift",
    answer:
      "Cek berurutan: (1) pengeluaran kecil yang belum dicatat → Expense → Cash Out Cepat; (2) uang diambil owner/disetor yang belum dicatat Setoran Kas; (3) transaksi QRIS yang tercatat tunai atau sebaliknya di menu Transaksi; (4) kembalian salah atau \"bayar nanti\" yang ternyata dibayar tunai. Tulis dugaan penyebab di catatan shift.",
  },
  {
    key: "shift-tidak-bisa-dibuka",
    topic: "Shift & kas",
    question: "Shift tidak bisa dibuka karena shift sebelumnya belum ditutup",
    answer:
      "Bawaannya hanya satu shift terbuka per outlet. Atasan bisa menutup shift kasir lain: hitung uang di laci secara fisik dan tulis alasan (wajib) — dicatat atas nama yang menutup dan ditandai untuk ditinjau. Setelah itu buka shift baru. Outlet dengan beberapa laci bisa mengizinkan beberapa shift di Pengaturan → Preferensi.",
  },
  {
    key: "setoran-pindah-kas",
    topic: "Shift & kas",
    question: "Mencatat setoran kas dan pindah kas (dengan tanggal)",
    answer:
      "Shift & Kasir → tab Setoran & Pindah Kas. Setoran Kas: uang laci diserahkan ke owner/brankas/bank. Pindah Kas: memindahkan uang antar akun kas atau bank (mis. tambahan modal dari Kas Besar ke laci). Tanggal bisa diisi untuk transaksi hari sebelumnya — jurnal memakai tanggal itu.",
  },
  {
    key: "pengeluaran-kecil",
    topic: "Shift & kas",
    question: "Mencatat pengeluaran kecil (parkir, galon, dll)",
    answer:
      "Expense Management → Cash Out Cepat, catat saat itu juga supaya kas shift tidak selisih. Pengeluaran di atas batas persetujuan (Pengaturan → Business & Tax) menunggu persetujuan Owner/Manager.",
  },

  /* ------------------------------------------------------------- Member & promo ------------------------------------------------------------- */
  {
    key: "member-poin",
    topic: "Member, promo & voucher",
    question: "Cara kerja member, poin, dan tingkatan",
    answer:
      "Membership & CRM: tambah pelanggan (nama + HP). Poin otomatis sekitar 1 poin per Rp10.000 belanja (dikali pengali tingkatan) ditambah poin main. Tingkatan (Silver, Gold, dst.) naik otomatis saat total belanja memenuhi syarat, tidak turun otomatis. Tukar poin dengan hadiah di detail pelanggan. Kartu member punya QR yang bisa discan di Rental PS.",
  },
  {
    key: "buat-paket",
    topic: "Member, promo & voucher",
    question: "Membuat paket harga tetap (mis. 3 jam Rp45.000)",
    answer:
      "Promo & Paket: isi nama paket, konsol (Semua atau jenis tertentu), durasi (menit), dan harga → Simpan Paket. Paket langsung muncul di panel Sesi Baru Rental PS. Paket yang pernah dipakai tidak bisa dihapus, hanya dinonaktifkan. Ide: lihat grafik Jam Ramai vs Jam Sepi di Dashboard untuk promo jam sepi.",
  },
  {
    key: "voucher",
    topic: "Member, promo & voucher",
    question: "Membuat dan memakai voucher diskon",
    answer:
      "Membership & CRM → Voucher: isi kode, jenis (persen/nominal), nilai, minimal belanja → Buat Voucher. Kasir mengetik kodenya di Rental PS atau Kasir. Voucher berhenti berlaku saat kuota pemakaiannya habis.",
  },

  /* ------------------------------------------------------------- Stok ------------------------------------------------------------- */
  {
    key: "tambah-produk",
    topic: "Stok & inventori",
    question: "Menambah produk dan stok awal",
    answer:
      "Inventory Control → Produk: tambah manual (nama, kategori, harga jual, Harga Modal, stok awal, stok minimum, barcode) atau unduh template Excel lalu upload. Harga Modal wajib diisi — tanpa itu laba terlihat terlalu besar. Menu olahan: buat Resep/BOM supaya stok bahan berkurang otomatis.",
  },
  {
    key: "belanja-supplier",
    topic: "Stok & inventori",
    question: "Mencatat pembelian stok dari supplier",
    answer:
      "Inventory → Belanja Supplier: pilih supplier, produk, jumlah, harga beli, ongkos lain (dibagi ke harga modal), lalu pilih sumber kas/bank bila dibayar sekarang atau biarkan sebagai hutang. Invoice yang tersimpan bisa diedit; isian yang belum selesai bisa disimpan sebagai draf. Jangan menambah stok pembelian lewat Penyesuaian Barang.",
  },
  {
    key: "stok-tidak-cocok",
    topic: "Stok & inventori",
    question: "Stok minus atau tidak cocok dengan fisik",
    answer:
      "1. Pastikan pembelian dicatat lewat Belanja Supplier/Purchase Order.\n2. Menu olahan: cek resepnya — stok bahan yang berkurang, bukan stok menu.\n3. Lakukan Stock Opname: hitung fisik, isi angkanya, lalu Terapkan Penyesuaian.\nBarang rusak/hilang: Penyesuaian Barang → Kurangi (Rusak/Waste).",
  },
  {
    key: "purchase-order",
    topic: "Stok & inventori",
    question: "Membuat pesanan pembelian (PO) ke supplier",
    answer:
      "Inventory → Purchase Order: \"Produk Perlu Restock\" menampilkan produk di bawah minimum (+ Isi ke form PO), atau \"Cek & Buat PO Otomatis\" untuk produk yang punya supplier utama. Saat barang datang tekan Terima Barang — stok bertambah dan hutang ke supplier dibuat otomatis.",
  },

  /* ------------------------------------------------------------- Laporan ------------------------------------------------------------- */
  {
    key: "laba-terlalu-besar",
    topic: "Laporan & pembukuan",
    question: "Laba di laporan terlihat terlalu besar",
    answer:
      "Biasanya ada produk tanpa Harga Modal (isi di Inventory → Produk; Laba Rugi juga menampilkan peringatannya), pengeluaran rutin (listrik, gaji, sewa) belum dicatat, atau penyusutan aset bulan itu belum dijalankan (Aset → Penyusutan).",
  },
  {
    key: "laporan-penjualan",
    topic: "Laporan & pembukuan",
    question: "Melihat laporan penjualan, unit terlaris, dan performa kasir",
    answer:
      "Laporan → Penjualan & Rental (unit terlaris, metode bayar), Dashboard Ringkasan (hari ini, jam ramai/sepi), Transaksi → Performa Kasir (penjualan, void, diskon, selisih per kasir). Laba Rugi, Neraca, dan Arus Kas lengkap ada di Accounting (paket Pro).",
  },
  {
    key: "periode-terkunci",
    topic: "Laporan & pembukuan",
    question: "Tidak bisa mencatat transaksi di bulan lalu",
    answer:
      "Bulan itu sudah ditutup di Accounting → Tutup Periode. Catat koreksinya dengan tanggal hari ini, atau minta Owner/Accountant membuka kembali periode bila benar-benar perlu.",
  },
  {
    key: "aset-tanpa-kas",
    topic: "Laporan & pembukuan",
    question: "Mencatat aset yang sudah dimiliki tanpa uang keluar",
    answer:
      "Aset → \"+ Aset Baru\" mencatat aset yang sudah dimiliki tanpa transaksi kas keluar. Untuk aset yang baru dibeli (ada uang keluar atau hutang), pakai tab Pembelian Aset. Penyusutan dijalankan tiap bulan di tab Penyusutan.",
  },

  /* ------------------------------------------------------------- NEXBILL TV — instalasi ------------------------------------------------------------- */
  {
    key: "tv-apa-itu",
    topic: "NEXBILL TV — instalasi",
    question: "Apa itu NEXBILL TV dan TV apa yang didukung?",
    answer:
      "Aplikasi yang dipasang langsung di Android TV / Google TV di bilik — tanpa PC, tanpa HP relay, tanpa ADB. TV menampilkan screensaver saat kosong, membuka HDMI PlayStation saat sesi dimulai, dan mengunci layar saat jeda/selesai/waktu habis. TV non-Android (VIDAA, webOS, Tizen, TV analog) tidak bisa memasang aplikasi — pakai smart plug.",
  },
  {
    key: "tv-install-downloader",
    topic: "NEXBILL TV — instalasi",
    question: "Cara memasang aplikasi NEXBILL TV di TV",
    answer:
      "1. Sambungkan TV ke WiFi outlet.\n2. Di TV buka Google Play → pasang \"Downloader\" (by AFTVnews).\n3. Buka Downloader → ketik nexbill.id/tvapk → Go → Install → Buka.\nPanduan bergambar: Pusat Bantuan → NEXBILL TV — Pasang & Pakai di TV Bilik.",
  },
  {
    key: "tv-izin-apk",
    topic: "NEXBILL TV — instalasi",
    question: "TV menolak memasang APK (sumber tidak dikenal)",
    answer:
      "Izinkan Downloader memasang aplikasi: Pengaturan TV → Aplikasi (atau Privasi / Keamanan) → Akses aplikasi khusus → Sumber tidak dikenal / Install unknown apps → aktifkan untuk Downloader. Letak menu berbeda per merek; kalau TV bertanya saat memasang, pilih Pengaturan lalu aktifkan. Google Play Protect memberi peringatan? Buka detail → tetap pasang. Pasang hanya dari nexbill.id/tvapk.",
  },
  {
    key: "tv-downloader-gagal",
    topic: "NEXBILL TV — instalasi",
    question: "Downloader tidak bisa membuka nexbill.id/tvapk",
    answer:
      "Pastikan TV tersambung internet (buka YouTube untuk tes) dan alamat diketik tanpa spasi: nexbill.id/tvapk. Coba ketik lengkap https://nexbill.id/downloads/nexbill-tv/nexbill-tv.apk. Masih gagal? Kirim foto layar TV ke Customer Service.",
  },
  {
    key: "tv-pairing",
    topic: "NEXBILL TV — instalasi",
    question: "Cara menghubungkan TV ke unit (kode pairing)",
    answer:
      "1. Owner/Manager: Pengaturan → TV Screensaver → tambah layar untuk unit itu → muncul kode 6 angka (berlaku 30 menit). Modul TV Screensaver harus aktif dan tipe TV unit = Android TV.\n2. Di TV buka NEXBILL TV, ketik kode dengan tombol angka remote.\n3. Muncul banner \"✓ TERHUBUNG\" dengan nama dan alamat outlet — TV sudah terhubung ke unit itu.",
  },
  {
    key: "tv-pilih-hdmi",
    topic: "NEXBILL TV — instalasi",
    question: "Setelah pairing: pilih HDMI dan izin tampil di atas aplikasi",
    answer:
      "Tahan OK di remote 3 detik → menu staf (PIN bila diminta) → \"Pilih input HDMI\" → pilih HDMI tempat PlayStation dicolok. Lalu \"Izin tampil di atas aplikasi lain\" → izinkan NEXBILL TV (wajib, supaya tombol Home/Input tidak bisa dipakai main tanpa sesi). Uji dengan sesi 1 menit dari dashboard.",
  },
  {
    key: "tv-update",
    topic: "NEXBILL TV — instalasi",
    question: "Cara memperbarui aplikasi NEXBILL TV",
    answer:
      "Tahan OK 3 detik → \"Cek pembaruan aplikasi\". Bila ada versi baru, buka Downloader dan ketik nexbill.id/tvapk lagi lalu Install — pairing, PIN, dan pengaturan tetap tersimpan.",
  },
  {
    key: "tv-satu-outlet",
    topic: "NEXBILL TV — instalasi",
    question: "Pairing ditolak: \"TV ini masih terdaftar di outlet lain\"",
    answer:
      "Satu TV hanya boleh dikontrol satu outlet. Owner outlet lama harus menghapus layar TV itu di Pengaturan → TV Screensaver, lalu ketik kode baru lagi. Ikatan yang tidak aktif lebih dari 30 hari dilepas otomatis. Satu layar juga hanya untuk satu TV: memakai kode baru untuk layar yang sama di TV lain memutus TV sebelumnya.",
  },

  /* ------------------------------------------------------------- NEXBILL TV — pemakaian ------------------------------------------------------------- */
  {
    key: "tv-kontrol-dashboard",
    topic: "NEXBILL TV — pemakaian",
    question: "Apakah TV bisa dikontrol dari dashboard saat pelanggan main?",
    answer:
      "Ya. Mulai, jeda, lanjut, perpanjang, pindah unit, dan selesai di Rental PS langsung berlaku di TV (biasanya < 1 detik, paling lambat ±5 detik). Jeda mengunci layar \"DIJEDA\". Tanpa ADB/relay — cukup aplikasi NEXBILL TV yang terhubung.",
  },
  {
    key: "tv-panel-kasir",
    topic: "NEXBILL TV — pemakaian",
    question: "Memulai sesi langsung dari TV (panel kasir)",
    answer:
      "Tekan OK di remote → masukkan PIN → pilih Mulai sesi (paket/durasi/bebas), Tambah waktu, atau Akhiri sesi. Tagihannya masuk ke Order Terbuka di dashboard. Butuh PIN layar atau PIN per staf yang sudah diatur di Pengaturan → TV Screensaver. Tetap bisa saat internet putus.",
  },
  {
    key: "tv-pin-staf",
    topic: "NEXBILL TV — pemakaian",
    question: "PIN per staf untuk TV",
    answer:
      "Pengaturan → TV Screensaver → PIN per Staf: Owner/Manager mengatur PIN 4–6 digit untuk tiap kasir (tidak boleh sama dengan staf lain, bukan 0000/1234). Sesi yang dimulai/diubah dari TV tercatat atas nama kasir itu. PIN Staf (layar) di atasnya tetap bisa dipakai Owner sebagai cadangan. TV mengingat PIN yang pernah benar supaya bisa dipakai saat offline.",
  },
  {
    key: "tv-lupa-pin",
    topic: "NEXBILL TV — pemakaian",
    question: "Lupa PIN TV / PIN salah terus",
    answer:
      "Owner/Manager mengganti PIN di Pengaturan → TV Screensaver (PIN Staf atau PIN per Staf). Saat offline, TV hanya menerima PIN yang pernah benar di TV itu; setelah 5 kali salah, PIN offline dikunci 5 menit. PIN yang baru diganti harus dipakai sekali saat TV online.",
  },
  {
    key: "tv-status-terhubung",
    topic: "NEXBILL TV — pemakaian",
    question: "Cara tahu TV terhubung ke dashboard",
    answer:
      "Di TV: pojok kiri atas screensaver menampilkan nama & alamat outlet dan \"Terhubung ke dashboard · unit\" (hijau) atau \"Offline · terakhir terhubung N mnt lalu\" (kuning). Di dashboard: kartu unit di Rental PS menampilkan chip \"TV terhubung\" / \"TV offline N mnt\" / \"TV belum dipasangkan\".",
  },
  {
    key: "tv-mode-staf",
    topic: "NEXBILL TV — pemakaian",
    question: "Membuka layar game tanpa sesi untuk tes",
    answer:
      "Menu staf (tahan OK 3 detik) → \"Buka layar game 10 menit (tes, tanpa tagihan)\" membuka layar game 10 menit tanpa tagihan, maksimal 3 kali per TV per hari, dan selalu tercatat di kartu Pengawasan NEXBILL TV & Audit Log. Main sungguhan harus lewat sesi supaya tertagih.",
  },
  {
    key: "tv-tampilan",
    topic: "NEXBILL TV — pemakaian",
    question: "Mengatur tampilan screensaver TV (judul, harga, QR, WiFi, mode malam)",
    answer:
      "Pengaturan → TV Screensaver: judul besar, baris konsol (kosongkan → otomatis dari unit, mis. \"PS2 • PS3 • PS4 • PS5\"), baris harga, teks tambahan, jam, status unit, QR booking (hanya tampil bila booking online aktif), nama WiFi (password tidak pernah tampil), warna aksen, dan Mode Malam (meredupkan maks. 90%). Perubahan langsung terlihat di TV.",
  },
  {
    key: "tv-qr-di-layar",
    topic: "NEXBILL TV — pemakaian",
    question: "QR di layar TV untuk apa? Pelanggan perlu aplikasi?",
    answer:
      "Tidak perlu aplikasi, cukup kamera HP. QR booking membuka halaman booking online outlet (alamatnya tertulis di bawah QR). QR di layar peringatan/waktu habis membuka halaman QR Pelanggan unit: lihat tagihan, minta tambah waktu, pesan F&B, panggil kasir — kasir yang menyetujui di Rental PS.",
  },
  {
    key: "tv-peringatan-waktu",
    topic: "NEXBILL TV — pemakaian",
    question: "Peringatan sisa waktu dan layar Waktu Habis",
    answer:
      "Pengaturan → TV Screensaver → Peringatan Waktu & Layar Waktu Habis: atur berapa menit sebelum habis TV menampilkan \"SISA WAKTU\" dengan QR bilik. Setelah waktu habis dan tagihan belum dibayar, TV menampilkan \"WAKTU HABIS\" berisi ajakan membayar di kasir (tanpa nominal).",
  },

  /* ------------------------------------------------------------- NEXBILL TV — masalah ------------------------------------------------------------- */
  {
    key: "tv-hdmi-tidak-muncul",
    topic: "NEXBILL TV — masalah",
    question: "Gambar PlayStation tidak muncul (\"menunggu sinyal HDMI\")",
    answer:
      "1. Pastikan PlayStation menyala dan kabel HDMI terpasang di port yang dipilih.\n2. Menu staf → \"Pilih input HDMI\" → pilih ulang port yang benar.\n3. Sebagian merek TV tidak mengizinkan HDMI tampil di dalam aplikasi — NEXBILL TV beralih sendiri ke mode \"Pindah input TV\". Untuk mode ini izinkan \"Tampil di atas aplikasi lain\" lewat menu staf.",
  },
  {
    key: "tv-kode-ditolak",
    topic: "NEXBILL TV — masalah",
    question: "Kode pairing ditolak / kedaluwarsa",
    answer:
      "Kode berlaku 30 menit dan hanya sekali pakai. Buat kode baru di Pengaturan → TV Screensaver (tombol kode baru pada layar itu) lalu ketik lagi. Pesan \"masih terdaftar di outlet lain\" = TV terikat ke outlet lain (lihat jawaban satu TV satu outlet).",
  },
  {
    key: "tv-kembali-ke-kode",
    topic: "NEXBILL TV — masalah",
    question: "TV tiba-tiba kembali meminta kode pairing",
    answer:
      "Layar itu dihapus/dilepas di dashboard, atau layar yang sama dipasangkan ke TV lain (satu layar = satu TV). Buat kode baru di Pengaturan → TV Screensaver lalu ketik lagi. Sebelum pairing ulang, pastikan TV online dan antrean sesi di panel kasir TV sudah terkirim (Status sinkron = 0 menunggu).",
  },
  {
    key: "tv-home-bisa-main",
    topic: "NEXBILL TV — masalah",
    question: "Pelanggan bisa main tanpa sesi lewat tombol Home/Input",
    answer:
      "Penjaga layar belum punya izin. Menu staf → \"Izin tampil di atas aplikasi lain\" → izinkan NEXBILL TV, dan pastikan Penjaga layar = Aktif di menu staf. Setelah itu NEXBILL TV kembali ke depan dalam ±1 detik bila ditinggalkan. Penjaga layar hanya bisa dimatikan lewat menu staf ber-PIN.",
  },
  {
    key: "tv-tidak-ikut-dashboard",
    topic: "NEXBILL TV — masalah",
    question: "Sesi dimulai di dashboard tapi TV tidak terbuka",
    answer:
      "1. Lihat chip di kartu unit Rental PS — \"TV offline\" berarti TV tidak tersambung internet atau aplikasinya tertutup.\n2. Pastikan layar TV dipasangkan ke unit yang benar (Pengaturan → TV Screensaver).\n3. Modul TV Screensaver aktif dan layar tidak dinonaktifkan.\n4. Sambil menunggu, mulai/kelola sesi dari panel kasir di TV (OK → PIN).",
  },
  {
    key: "tv-sesi-ditolak",
    topic: "NEXBILL TV — masalah",
    question: "Kartu merah \"Pengawasan NEXBILL TV\" — sesi dari TV ditolak",
    answer:
      "Sesi yang dibuat di TV (biasanya saat offline) ditolak server, mis. unit sudah dipakai sesi lain, layar dinonaktifkan, atau aksi lebih dari 72 jam. Pelanggan mungkin sudah bermain tapi belum tertagih: tagih manual di Kasir/Rental PS, lalu tekan tandai sudah ditangani di kartu tersebut di halaman Rental PS.",
  },
  {
    key: "tv-jam-salah",
    topic: "NEXBILL TV — masalah",
    question: "Jam TV salah / mati listrik — apakah waktu sesi kacau?",
    answer:
      "Tidak. Aplikasi memakai jam server saat online dan jam yang tidak bisa mundur saat offline, jadi memundurkan jam TV tidak membuat main gratis. Setelah listrik padam, TV membuka NEXBILL TV sendiri dan sesi berjalan dipulihkan. Waktu selama TV mati tidak dihitung di layar, tapi tagihan sesi berdurasi tetap tidak berubah.",
  },
  {
    key: "tv-tidak-auto-start",
    topic: "NEXBILL TV — masalah",
    question: "Setelah TV dinyalakan, NEXBILL TV tidak terbuka sendiri",
    answer:
      "Buka aplikasi sekali secara manual. Pastikan izin \"Tampil di atas aplikasi lain\" diberikan (menu staf) — sebagian TV membutuhkannya untuk membuka aplikasi saat menyala. Bila memungkinkan, pilih menu staf → \"Jadikan aplikasi utama TV\" supaya NEXBILL TV menjadi aplikasi beranda.",
  },

  /* ------------------------------------------------------------- Kontrol perangkat ------------------------------------------------------------- */
  {
    key: "pilih-cara-kontrol",
    topic: "Kontrol perangkat (Agent & smart plug)",
    question: "Cara kontrol TV mana yang cocok untuk outlet saya?",
    answer:
      "Android TV / Google TV: paling mudah aplikasi NEXBILL TV (tanpa PC/ADB). Alternatif: Relay Agent (NexbillAgent di PC Windows atau HP Android) yang menyalakan/mematikan TV lewat jaringan. TV analog, TV digital biasa, dan smart TV non-Android (VIDAA, webOS, Tizen, dll): smart plug yang memutus/menyambung listriknya. Tanpa kontrol pun sesi tetap berjalan; TV dinyalakan manual dengan remote.",
  },
  {
    key: "agent-token",
    topic: "Kontrol perangkat (Agent & smart plug)",
    question: "Cara memasang NexbillAgent di PC kasir",
    answer:
      "Kontrol Perangkat → Panduan Setup Perangkat: (1) tekan \"Minta Token Relay Agent\" — token dibalas lewat Customer Service; (2) unduh NexbillAgent dan ekstrak di PC Windows kasir; (3) jalankan dan tempel token; (4) siapkan tiap TV (WiFi sama, opsi yang diminta panduan, kunci IP); (5) tambahkan TV (IP) di Kontrol Perangkat lalu hubungkan ke unit. Panduan Lengkap NexbillAgent berisi 28 masalah umum (P01–P28).",
  },
  {
    key: "agent-offline",
    topic: "Kontrol perangkat (Agent & smart plug)",
    question: "Status perangkat offline / TV tidak menyala otomatis lewat Agent",
    answer:
      "1. Pastikan PC (atau HP) yang menjalankan NexbillAgent menyala dan terhubung internet.\n2. TV dan PC harus di WiFi yang sama, IP TV tidak berubah (kunci IP sesuai panduan).\n3. Relay HP Android: buka Termux, ketik nexbill; perbarui dengan nexbill-update; atur baterai Termux \"Tidak dibatasi\".\nSementara itu nyalakan TV manual — sesi tetap berjalan normal.",
  },
  {
    key: "relay-hp-android",
    topic: "Kontrol perangkat (Agent & smart plug)",
    question: "Tidak punya PC — pakai HP Android sebagai relay",
    answer:
      "HP Android 7+ yang selalu di outlet, dicas, dan di WiFi yang sama dengan TV bisa jadi Relay Agent. Kontrol Perangkat → Panduan Setup Perangkat → TV → tab \"Pakai HP Android (tanpa PC)\": minta token, pasang Termux & Termux:Boot dari F-Droid, salin satu perintah, tempel token, lalu sambungkan TV dengan perintah nexbill-tv diikuti IP TV dan pilih Izinkan di TV. Lebih mudah lagi: pakai aplikasi NEXBILL TV.",
  },
  {
    key: "smart-plug-tuya",
    topic: "Kontrol perangkat (Agent & smart plug)",
    question: "Smart plug Tuya/Smart Life tiba-tiba tidak merespons",
    answer:
      "Kemungkinan masa Trial Tuya Cloud habis (perlu diperpanjang sekitar sebulan sekali di iot.tuya.com → Service API → IoT Core → Extend Trial). Cek Pengaturan → Integrasi Tuya Cloud API: akun berstatus \"Tidak terhubung\" yang perlu diperpanjang. Akun Trial hanya sekitar 8 perangkat — lebih dari itu buat akun Tuya kedua dan tambahkan sebagai akun baru.",
  },
  {
    key: "smart-plug-tambah",
    topic: "Kontrol perangkat (Agent & smart plug)",
    question: "Cara menambah smart plug",
    answer:
      "Kontrol Perangkat: smart plug resmi NEXBILL cukup isi nomor seri di \"Klaim Smart Plug NEXBILL\". Tasmota: isi nama & topik MQTT. Tuya/Smart Life: tambahkan akun Tuya Cloud (Access ID & Secret) di Pengaturan → Business & Tax → Integrasi Tuya Cloud API, lalu tambah perangkat dengan Device ID. Terakhir hubungkan perangkat ke unit. Smart plug belum bisa ditambahkan selama masa percobaan.",
  },

  /* ------------------------------------------------------------- Offline ------------------------------------------------------------- */
  {
    key: "offline-dashboard",
    topic: "Internet putus / Mode Offline",
    question: "Internet kasir putus — apakah masih bisa transaksi?",
    answer:
      "Bisa. Rental PS pindah ke Mode Offline: mulai/jeda/tambah/akhiri sesi dan pembayaran tunai disimpan di perangkat dan dikirim otomatis begitu online. QRIS/transfer diterima setelah online. Jangan hapus data browser sebelum semua transaksi terkirim. Tagihan offline adalah perkiraan; total final dihitung server saat sinkron.",
  },
  {
    key: "offline-tv-main",
    topic: "Internet putus / Mode Offline",
    question: "WiFi mati saat ada pelanggan main di NEXBILL TV",
    answer:
      "TV tetap menghitung sisa waktu dan mengunci layar tepat saat habis (timer menampilkan \"offline\"). Dashboard tidak bisa mengirim perintah ke TV selama offline — tambah waktu atau akhiri sesi lewat panel kasir di TV (OK → PIN). Data tersinkron otomatis saat internet kembali.",
  },
  {
    key: "offline-unit-tv-dari-tv",
    topic: "Internet putus / Mode Offline",
    question: "Dashboard dan TV sama-sama offline — mulai sesi dari mana?",
    answer:
      "Untuk unit yang memakai NEXBILL TV, mulai/tambah/akhiri sesi dari panel kasir di TV-nya, jangan dari Mode Offline dashboard — supaya layar game benar-benar terbuka dan sesi tidak tercatat dua kali. Unit tanpa NEXBILL TV dikelola dari Mode Offline dashboard. Sesi ganda tetap ditolak server dan muncul di kartu Pengawasan NEXBILL TV.",
  },
  {
    key: "offline-hanya-tv",
    topic: "Internet putus / Mode Offline",
    question: "Hanya TV yang offline, dashboard online",
    answer:
      "Kartu unit di Rental PS menampilkan \"TV offline N mnt\" dan dashboard meminta konfirmasi saat memulai sesi (sesi tetap tercatat dan tertagih, tapi layar tidak terbuka otomatis). Periksa WiFi/daya TV, buka ulang aplikasi NEXBILL TV, atau mulai dari panel kasir di TV.",
  },

  /* ------------------------------------------------------------- Printer ------------------------------------------------------------- */
  {
    key: "printer-tidak-cetak",
    topic: "Printer & struk",
    question: "Struk tidak tercetak atau terpotong",
    answer:
      "1. Pastikan printer menyala, kertas terpasang, dan printer terpilih di dialog cetak browser.\n2. Atur lebar kertas (58mm/80mm) di Pengaturan → Business & Tax → Printer lalu \"Simpan untuk Komputer Ini\" — ulangi di setiap komputer kasir (pengaturan tersimpan per komputer).",
  },
  {
    key: "printer-bluetooth",
    topic: "Printer & struk",
    question: "Printer Bluetooth dari HP tidak muncul",
    answer:
      "Pengaturan → Printer → Cara cetak \"Bluetooth langsung dari HP (printer BLE)\" → Pilih Printer Bluetooth → Tes Cetak. Kalau printer tidak muncul, printernya Bluetooth Classic — pilih \"Lewat aplikasi RawBT\". iPhone belum didukung untuk cetak Bluetooth.",
  },
  {
    key: "footer-struk",
    topic: "Printer & struk",
    question: "Mengubah tulisan di struk (footer, WiFi, logo)",
    answer:
      "Pengaturan → Business & Tax: Footer Struk, nama & password WiFi (tampil di struk dan halaman booking), logo, dan alamat outlet. Cetak ulang struk lama dari Transaksi → Struk.",
  },

  /* ------------------------------------------------------------- Bantuan ------------------------------------------------------------- */
  {
    key: "hubungi-tim",
    topic: "Bantuan & Telegram",
    question: "Cara menghubungi tim NEXBILL",
    answer:
      "Menu Customer Service → \"+ Tiket Baru\": pilih kategori, tulis masalah, lampirkan foto/video layar. Bot NEXBILL membalas 24 jam dan meneruskan ke tim bila perlu; balasan tim muncul di tiket yang sama. Darurat (outlet tidak bisa menagih): tulis jelas \"semua TV terkunci\" / \"tidak bisa login\" supaya diprioritaskan.",
  },
  {
    key: "telegram-support",
    topic: "Bantuan & Telegram",
    question: "Support lewat Telegram",
    answer:
      "Customer Service → kartu \"Support 24 jam di Telegram\" → Hubungkan Telegram → tekan Start di bot. Tulis pertanyaan kapan saja; /tim untuk langsung diteruskan ke tim, /status untuk cek langganan & perangkat, /putus untuk memutuskan. Bot hanya membaca teks — foto kirim lewat tiket di dashboard.",
  },
  {
    key: "darurat-p1",
    topic: "Bantuan & Telegram",
    question: "Darurat: outlet tidak bisa menagih / semua TV terkunci",
    answer:
      "Langkah darurat sambil menunggu tim: (1) dashboard tidak terbuka/internet mati → pakai Mode Offline di Rental PS (tunai); (2) TV terkunci → mulai sesi dari panel kasir NEXBILL TV (OK → PIN); (3) kontrol otomatis gagal → nyalakan TV/PS manual, sesi tetap dicatat. Tulis di Customer Service atau Telegram — kata \"semua TV\" / \"tidak bisa login\" ditandai darurat dan petugas jaga diberi tahu.",
  },
];
