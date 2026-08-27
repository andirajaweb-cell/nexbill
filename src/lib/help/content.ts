/**
 * Data-driven content for the in-app Help Center (/dashboard/help). Plain
 * data (not JSX) on purpose — keeps this file skimmable/editable as a manual
 * and lets the page component do full-text search across every step/note
 * without any content-extraction gymnastics.
 *
 * Sourced from a full read-through of every dashboard page + their API
 * routes as of this writing. If a feature's UI changes, this file will drift
 * — treat it as documentation to keep in sync, not a live introspection of
 * the code.
 */

export interface HelpSubsection {
  title: string;
  navHint?: string;
  intro?: string;
  steps?: string[];
  notes?: string[];
}

export interface HelpCategory {
  id: string;
  group: string;
  label: string;
  navHint?: string; // where to find it, if not obvious from the label
  summary: string;
  roles?: string;
  steps?: string[];
  notes?: string[];
  subsections?: HelpSubsection[];
}

export const HELP_GROUPS_ORDER = [
  "Mulai Cepat",
  "Operasional Harian",
  "Penjualan & Pelanggan",
  "Inventori & Aset",
  "Keuangan & Akuntansi",
  "Manajemen & Sistem",
] as const;

export const HELP_CATEGORIES: HelpCategory[] = [
  // ================= MULAI CEPAT =================
  {
    id: "konsep-dasar",
    group: "Mulai Cepat",
    label: "Konsep Dasar NEXBILL",
    summary:
      "NEXBILL mengatur satu atau lebih Outlet/Cabang. Setiap staf punya akun dengan Role (peran) yang menentukan menu apa yang bisa mereka ubah. Semua transaksi (Rental PS, POS, Home Rental, PPOB, dll) otomatis tercatat ke Accounting — kamu tidak perlu input dobel.",
    steps: [
      "Login dengan email & password staf di halaman Login. Setelah masuk, sistem otomatis memuat outlet aktif akun kamu (dilihat dari sesi login, bukan dari cookie yang bisa diubah sembarangan).",
      "Kalau akunmu terhubung ke lebih dari satu outlet, menu \"Semua Outlet\" akan muncul di sidebar — dari situ kamu bisa lihat ringkasan semua outlet sekaligus dan pindah outlet aktif dengan satu klik.",
      "Sebelum mulai transaksi di kasir, buka Shift dulu di menu Shift & Kasir (isi modal awal kas). Semua penjualan cash akan direkonsiliasi ke shift yang sedang aktif.",
      "Struktur menu di sidebar kiri sudah mengikuti alur kerja sehari-hari: Operasional (Rental PS, Kasir, Booking) di atas, lalu Penjualan & Pelanggan, lalu Inventori & Keuangan, lalu Pengaturan di paling bawah.",
      "Tutup shift di akhir hari/pergantian kasir — sistem akan minta hitung fisik kas per pecahan dan verifikasi saldo channel non-tunai (GoPay/DANA/BukuPay/dll) sebelum shift benar-benar tertutup.",
    ],
    notes: [
      "Role yang tersedia: Superuser, Owner, Manager, Accountant, Supervisor, Cashier, Kitchen. Superuser adalah role tertinggi dan satu-satunya yang bisa mengedit matriks izin (Role & Izin) serta mengakses Admin Data.",
      "PENTING: beberapa tombol (terutama \"Hapus\" permanen, redeem poin, edit/hapus data master) hanya muncul untuk akun dengan role PERSIS \"Superuser\" — akun \"Owner\" tidak otomatis melihatnya walau secara izin (permission) setara dengan Superuser di banyak modul lain. Kalau kamu owner dan tidak melihat tombol Hapus di suatu halaman, itu memang disengaja, bukan bug.",
      "Hampir semua menu di sidebar TERLIHAT oleh semua role — pembatasan sebenarnya ada di level tombol/aksi di dalam halamannya, bukan di level menu. Jadi jangan kaget kalau kasir bisa membuka halaman Accounting, misalnya — dia cuma tidak bisa mengedit apa pun di sana.",
      "Setiap outlet punya Chart of Accounts (COA) sendiri yang otomatis dibuatkan (seed) saat outlet pertama kali dipakai — kamu tidak perlu setup akuntansi dari nol.",
    ],
  },

  // ================= OPERASIONAL HARIAN =================
  {
    id: "rental-ps",
    group: "Operasional Harian",
    label: "Rental PS",
    summary:
      "Halaman inti untuk mulai/kelola/selesaikan sesi sewa PlayStation per unit/station — termasuk tambah aksesoris & F&B ke bill sesi yang sedang berjalan, kontrol TV, dan pembayaran di akhir sesi.",
    subsections: [
      {
        title: "Mulai Sesi Baru",
        steps: [
          "Di panel \"SESI BARU\" (kanan), pilih Station yang tersedia (unit yang sedang dipakai/maintenance tidak muncul di pilihan).",
          "Opsional: pilih Paket (harga flat dari menu Promo & Paket) — kalau dipilih, billing tidak lagi per jam. Kalau tidak, biarkan \"Per Jam\" lalu pilih durasi preset (30/60/90/120/180/240 menit) atau biarkan \"Terbuka\" (tanpa batas waktu, dihitung berjalan terus sampai di-stop manual).",
          "Isi data customer: toggle Non-Member (nama bebas untuk walk-in) atau Member (ketik nama/nomor member — sistem cari otomatis, klik hasil pencarian untuk pakai harga & poin member).",
          "Opsional: isi nama game yang dimainkan, dan centang \"Customer Bayar Dimuka (DP)\" kalau mau tarik deposit di awal (cash atau QRIS) — nominal otomatis terisi dari harga paket/estimasi jam tapi bisa diubah.",
          "Klik MULAI SESI. Kalau DP-nya QRIS, kode QR muncul untuk discan customer, lalu klik \"Tandai Diterima\" setelah pembayaran masuk.",
        ],
      },
      {
        title: "Selama Sesi Berjalan",
        steps: [
          "Setiap unit yang sedang dipakai tampil sebagai kartu dengan timer countdown (atau jam berjalan biasa kalau \"Terbuka\") dan rincian biaya real-time (sewa + aksesoris + F&B).",
          "Jeda/Lanjut — menjeda sesi menghentikan sementara akumulasi biaya waktu sewa.",
          "Add Time — tambah waktu dari preset +10 menit sampai +120 menit.",
          "Pindah Unit — pindahkan sesi (beserta bill & timer-nya) ke station lain yang kosong.",
          "+ Aksesoris — sewa item tambahan (controller ekstra/VR/headset) yang dihitung per jam sejak ditambahkan; klik \"Kembalikan\" untuk menghentikan billing item itu.",
          "+ F&B — tambah produk makanan/minuman ke bill sesi ini; item langsung masuk antrian Kitchen Display.",
          "TV On / TV Off — kontrol daya TV lewat smart plug yang terhubung ke unit ini (kalau unit belum dihubungkan ke perangkat apa pun, tombol ini akan menampilkan pesan error, bukan menyala).",
        ],
      },
      {
        title: "Mengakhiri Sesi & Bayar",
        steps: [
          "Klik \"End Session & Bayar\" — sistem hitung tagihan final (sewa + aksesoris + F&B) dan tampilkan kartu \"Sesi Selesai\".",
          "Opsional sebelum ada pembayaran masuk: masukkan Diskon (Rp), centang Pajak, atau terapkan kode voucher/reward customer.",
          "Isi \"Jumlah bayar\" (default: sisa tagihan penuh) dan pilih Metode Pembayaran, lalu klik Bayar.",
          "Cash/manual langsung tercatat lunas. QRIS/e-wallet (qris, fastpay_h2h, dana, gopay, bukupay) menampilkan QR dan menunggu konfirmasi otomatis — ada juga tombol manual \"Tandai Diterima\" kalau webhook lambat/gagal.",
          "Bisa bayar sebagian dulu dengan satu metode, sisanya nanti dengan metode lain (split payment) — kartu akan tetap terbuka menampilkan sisa tagihan.",
          "Kalau customer mau bayar nanti, klik \"Tutup (bayar nanti di POS)\" — tagihan tetap tersimpan sebagai order belum lunas dan bisa dibayar dari halaman Kasir (POS) atau Transaksi kapan saja.",
        ],
      },
      {
        title: "Kelola Unit PS",
        steps: [
          "Klik \"Kelola Unit\" untuk membuka panel tambah/edit unit — isi nama, konsol (PS2 s/d PS5 Slim), tipe TV, dan tarif per jam.",
          "\"Set Maintenance\" menonaktifkan unit sementara untuk perbaikan — tidak bisa dilakukan kalau unit sedang dipakai sesi aktif (hentikan sesi dulu).",
          "\"Nonaktifkan/Aktifkan\" mengarsip/mengembalikan unit — unit yang diarsip hilang dari grid dan dari halaman booking publik, tapi riwayat sesinya tetap tersimpan.",
        ],
      },
    ],
    notes: [
      "Sesi dengan durasi terjadwal yang waktunya habis akan otomatis di-stop oleh sistem — kamu tidak perlu memantau terus, tapi pembayarannya tetap harus diselesaikan manual.",
      "Alarm bunyi otomatis sekali saat sisa waktu tinggal ≤5 menit.",
      "Produk kategori \"Sewa Perangkat\" sengaja tidak muncul di panel +F&B halaman ini — itu domain modul Home Rental (Sewa Dibawa Pulang), bukan sesi in-house.",
      "Tidak ada pembatasan role khusus di halaman ini — siapa pun staf yang login di outlet ini bisa mulai/kelola/bayar sesi.",
    ],
  },
  {
    id: "billing-board",
    group: "Operasional Harian",
    label: "Live Billing Board",
    summary:
      "Layar pemantauan (cocok untuk TV/monitor kedua) yang menampilkan semua sesi rental yang sedang aktif secara real-time — murni tampilan, tidak ada aksi yang bisa dilakukan dari sini.",
    steps: [
      "Buka halaman ini di layar terpisah (TV/monitor) supaya tim bisa memantau semua station sekaligus tanpa harus bolak-balik ke halaman Rental PS.",
      "Halaman ini auto-refresh setiap 3 detik — tidak perlu direfresh manual.",
      "Setiap kartu unit menampilkan: nama unit & konsol, badge Running/Jeda, nama customer & game, timer berjalan, catatan perpanjangan waktu, dan rincian biaya (sewa + aksesoris + F&B + total berjalan).",
      "Tile ringkasan di atas menunjukkan total sesi aktif, jumlah yang sedang bermain vs dijeda, total item F&B dalam proses, dan total tagihan berjalan gabungan semua sesi.",
    ],
    notes: ["Semua aksi (bayar, tambah waktu, dll) tetap dilakukan dari halaman Rental PS — board ini display-only."],
  },
  {
    id: "booking",
    group: "Operasional Harian",
    label: "Booking",
    summary:
      "Kelola reservasi unit PS di muka — buat booking manual, check-in cepat pakai kode, konfirmasi/batalkan/pindah unit, dan lihat status waiting list.",
    steps: [
      "Check-in cepat: ketik kode booking (mis. BK-00001) di kotak pencarian atas, tekan Enter atau klik \"Cari & Check-in\".",
      "Booking baru: isi nama & HP customer, pilih Unit tertentu ATAU \"Unit apa saja\" + tipe konsol, tentukan jadwal mulai/selesai, opsional DP dan catatan, klik \"Buat Booking\".",
      "Kalau jadwal yang diminta bentrok dengan booking lain, sistem otomatis memasukkan booking baru ke Waiting List (bukan ditolak total) — posisi antreannya ditampilkan di notifikasi.",
      "Per baris booking: Konfirmasi (pending/waitlist → confirmed), Check-in (menempati unit), QR (tampilkan kode QR untuk dipindai customer), Pindah Unit (reassign ke unit lain + alasan opsional), No-show, dan Batal (perlu alasan).",
      "\"Batalkan No-show\" (mengembalikan status ke Confirmed) hanya terlihat untuk akun Owner/Superuser, dan hanya pada booking yang statusnya sedang No-show.",
    ],
    notes: [
      "Reminder WhatsApp otomatis terkirim di H-24 jam, H-2 jam, dan 15 menit sebelum jadwal mulai — ini berjalan otomatis lewat scheduler, tidak perlu dipicu manual.",
      "Booking yang tidak pernah di-check-in akan otomatis dilepas (auto-release) oleh scheduler setelah lewat batas waktu.",
      "Badge warna pada tiap booking menunjukkan sumbernya: Kasir (input manual), Online (booking publik), atau WhatsApp.",
    ],
    roles: "Konfirmasi/check-in/batal/pindah unit butuh izin manage_bookings (Owner, Superuser, Manager, Supervisor, Cashier — TIDAK termasuk Accountant/Kitchen).",
  },
  {
    id: "pos",
    group: "Operasional Harian",
    label: "Kasir (POS)",
    summary:
      "Jual produk F&B/retail (bukan waktu sewa PS, itu ada di Rental PS) — cari/scan produk, susun keranjang, terapkan diskon/voucher/pajak, checkout dan bayar.",
    steps: [
      "Ketik di kotak pencarian untuk memfilter produk (bisa multi-kata), atau scan barcode langsung. Kalau hasil pencarian tepat 1 produk (atau barcode/SKU cocok persis) lalu tekan Enter, produk otomatis masuk keranjang dan kotak pencarian kosong lagi — cocok untuk alur kerja scanner barcode.",
      "Tanpa kata kunci, produk tampil sebagai grid per kategori — klik tile produk untuk menambah ke keranjang (klik lagi untuk menambah qty).",
      "Di panel Keranjang: atur qty per baris dengan +/-, opsional isi Diskon Rp dan/atau kode voucher (klik Cek untuk validasi), centang Pajak dan/atau Service Charge, pilih Metode Pembayaran.",
      "Klik Bayar {total} — order langsung dibuat lalu diproses pembayarannya. Cash: klik \"Konfirmasi Cash Diterima\" setelah uang diterima. QRIS: tampilkan/cetak dari halaman Pembayaran, tunggu konfirmasi otomatis.",
      "\"Cetak Struk\" membuka halaman struk yang bisa langsung diprint (lihat kategori Pengaturan Printer untuk mengatur lebar kertas per komputer).",
      "Order yang belum dibayar (mis. dari tambahan F&B sesi rental) muncul sebagai kartu \"Open Orders\" di atas grid produk — bisa di-Split (pecah jadi beberapa bagian) atau digabung (centang 2+ lalu \"Gabung N Order\") sebelum dibayar.",
    ],
    notes: [
      "Isi keranjang yang belum dibayar otomatis tersimpan di browser (localStorage) — refresh halaman atau pindah menu tidak akan menghilangkan keranjang yang sedang disusun.",
      "Produk kategori \"Sewa Perangkat\" tidak muncul di halaman ini — itu ranah Home Rental.",
      "Tidak ada pembatasan role di halaman ini — siapa pun staf yang login bisa jualan & checkout.",
    ],
  },
  {
    id: "kitchen",
    group: "Operasional Harian",
    label: "Kitchen Display",
    summary:
      "Papan antrian dapur (KDS) — semua item F&B yang perlu disiapkan, baik dari POS maupun tambahan F&B sesi rental, dalam 4 kolom status.",
    steps: [
      "Item baru muncul di kolom Baru, lalu berpindah lewat Dikonfirmasi → Diproses → Siap seiring tombol aksi diklik: Konfirmasi → Mulai Masak → Siap Diantar → Sudah Diantar (menghilang dari papan).",
      "Kartu di kolom Baru punya tombol tambahan \"Batal\" — minta alasan pembatalan (default \"Bahan habis\").",
      "Toggle 🔊/🔇 di kanan atas menyalakan/mematikan alarm suara (tersimpan per browser). Tombol \"Aktifkan Notifikasi Browser\" mengaktifkan notifikasi push OS kalau belum diizinkan.",
    ],
    notes: [
      "Papan auto-refresh tiap 4 detik. Item baru memicu bunyi ganda + notifikasi \"Pesanan Baru\"; item yang baru saja jadi \"Siap\" memicu bunyi berbeda + notifikasi \"Makanan Siap\" — supaya dapur & pelayan tidak perlu terus menatap layar.",
      "Meski ada izin \"kitchen_display\" di sistem, saat ini SEMUA staf yang login bisa membuka dan menggerakkan Kitchen Display, tidak dibatasi per role.",
    ],
  },
  {
    id: "devices",
    group: "Operasional Harian",
    label: "Kontrol Perangkat",
    summary:
      "Daftarkan dan kendalikan smart plug/TV yang terpasang di tiap station PS — nyala/mati, hubungkan ke unit rental, dan (untuk role tertentu) atur infrastruktur relay Android TV.",
    subsections: [
      {
        title: "Nyala/Mati Perangkat (semua staf)",
        steps: ["Klik Nyalakan/Matikan di kartu perangkat mana pun — tidak perlu izin khusus."],
      },
      {
        title: "Tambah/Edit/Hapus Perangkat (izin manage_devices)",
        steps: [
          "Isi form \"Tambah Perangkat\": nama, lalu pilih Protokol (Tasmota MQTT / HTTP Generik / Tuya Smart Life / Sonoff eWeLink / Android TV via ADB langsung / Android TV via Relay Agent) — field yang muncul menyesuaikan protokol yang dipilih.",
          "Klik Edit pada kartu untuk mengubah field yang sama secara inline, atau Hapus untuk menghapus (unit rental yang terhubung ke perangkat ini akan otomatis terlepas).",
          "Di tabel \"Hubungkan Perangkat ke Unit Rental\", pilih perangkat dari dropdown di sebelah tiap unit untuk menautkannya.",
        ],
      },
      {
        title: "Relay Agent untuk Android TV berbasis Cloud",
        steps: [
          "Dipakai kalau server aplikasi tidak bisa langsung menjangkau jaringan lokal TV outlet. Klik \"Buat Relay Agent\", beri nama, salin token pairing sekali-tampil, lalu jalankan `npm run relay:agent` di PC outlet menggunakan token itu.",
          "Status agent (online/offline + terakhir aktif) terlihat di daftar. Hapus agent hanya bisa dilakukan setelah TV yang mengacu ke agent itu dipindahkan dulu.",
        ],
      },
    ],
    notes: [
      "Staf tanpa izin manage_devices hanya bisa menyalakan/mematikan — tombol tambah/edit/hapus/hubungkan disembunyikan total.",
      "Perangkat Tuya Smart Life dikendalikan lewat SATU akun Tuya Cloud API bersama milik NEXBILL, dipakai untuk semua outlet/merchant di semua negara — bukan akun per-outlet. Outlet tidak perlu (dan tidak bisa) mengatur kredensial Tuya sendiri; cukup pasang device di aplikasi Smart Life lalu hubungi NEXBILL support untuk didaftarkan.",
    ],
    roles: "manage_devices: Owner, Superuser, Manager, Supervisor (tidak termasuk Cashier/Accountant/Kitchen).",
  },
  {
    id: "home-rental",
    group: "Operasional Harian",
    label: "Home Rental (Sewa Dibawa Pulang)",
    navHint: "Muncul di sidebar hanya kalau modul ini diaktifkan (Pengaturan → Feature Management).",
    summary:
      "Modul terpisah untuk sewa unit PS/TV/aksesoris yang DIBAWA PULANG customer (bukan dimainkan di tempat) — booking, checkout dengan deposit, aneka jenis tarif, pengembalian dengan checklist & penilaian, dan penilaian risiko customer.",
    subsections: [
      {
        title: "Membuat Sewa Baru",
        steps: [
          "Pilih customer (cek dulu riwayat & skor risikonya di tab Risk & Approval kalau ragu), pilih produk (PS3/PS4/PS5/Playbox/TV 32\"/40\"/43\"/Aksesoris tambahan) dan paket durasi.",
          "Tarif otomatis mengikuti tingkatan durasi yang berlaku: ≤12 jam pakai tarif per-12-jam, 24 jam pakai tarif harian, 2-3 hari dihitung harian + tambahan per hari ekstra, 7 hari ke atas otomatis pakai tarif mingguan (kalau diaktifkan) + sisa hari dihitung ekstra.",
          "Isi jarak antar-jemput kalau customer minta diantar/dijemput — biaya otomatis dihitung berdasarkan tingkatan jarak yang sudah diatur di Kebijakan.",
          "Ambil deposit jaminan sesuai kebijakan (bisa berjenjang menurut tingkatan kepercayaan/loyalitas customer), lalu selesaikan checkout & pembayaran.",
        ],
      },
      {
        title: "Proses Pengembalian",
        steps: [
          "Saat unit dikembalikan, kasir WAJIB mencentang checklist kelengkapan (kondisi fisik, kabel, kontroler, dus, dll — daftar checklist item bisa diedit di tab Kebijakan).",
          "Beri penilaian bintang 1-5 untuk kondisi/perilaku customer saat pengembalian, plus catatan opsional.",
          "Kalau ada kerusakan, isi biaya penggantian kerusakan — sistem otomatis memotong dari deposit yang ditahan dulu; kalau kerusakan melebihi deposit, sisanya (damageExtraOwed) ditagih tunai dengan metode pembayaran yang dipilih.",
          "Kalau ada keterlambatan, denda keterlambatan dihitung otomatis sesuai tingkatan yang diatur di Kebijakan.",
          "Status deposit akhir otomatis tercatat: Dilepas penuh / Dipotong sebagian / Hangus total — tergantung besar kerusakan vs deposit yang ditahan.",
        ],
      },
      {
        title: "Risk & Approval",
        steps: [
          "Lihat riwayat transaksi terakhir lintas-outlet per customer (bisa pilih tampilkan 20/30/50 transaksi terakhir) — berguna untuk menilai reputasi customer sebelum menyetujui sewa berisiko tinggi.",
          "Bagian \"Penilaian Terakhir\" menampilkan hasil checklist & rating bintang dari pengembalian paling akhir customer tersebut, bukan cuma data pribadi biasa.",
        ],
      },
      {
        title: "Kebijakan (aturan yang bisa diedit pemilik)",
        steps: [
          "Semua aturan berikut disimpan per outlet dan bisa diedit langsung: bobot risiko customer, tingkatan deposit berdasar loyalitas, tingkatan denda keterlambatan, tingkatan biaya antar-jemput berdasar jarak, aturan kerusakan, daftar item checklist pengembalian, dan aturan/teks yang tercetak di struk/perjanjian sewa.",
          "Tarif produk (termasuk tarif mingguan & tarif per-hari-tambahan) bisa diedit lewat modal \"Edit Tarif\" di kartu tiap produk/paket.",
        ],
      },
      {
        title: "Dashboard & Struk",
        steps: [
          "Tab Dashboard menampilkan kartu referensi aturan tercetak (printed rules) supaya kasir gampang cek aturan tanpa buka tab Kebijakan terus-menerus."
        ],
      },
    ],
    notes: [
      "Semua jenis pendapatan Home Rental (sewa 12/24 jam, mingguan, 2-3 hari, tambahan 1 hari, aksesoris, TV 32/40/43, Playbox, penggantian kerusakan, denda keterlambatan, biaya antar-jemput) otomatis masuk ke Accounting dan muncul di tab Home Rental pada halaman Laporan — kamu tidak perlu jurnal manual.",
      "Modul ini hanya aktif kalau diizinkan lewat Pengaturan → Feature Management (dan hanya Superuser yang bisa menyalakan/mematikannya).",
    ],
  },
  {
    id: "shift",
    group: "Operasional Harian",
    label: "Shift & Kasir",
    summary:
      "Buka shift dengan modal awal kas, tutup shift dengan hitung fisik kas per pecahan (blind count) + verifikasi saldo channel non-tunai, dan kelola daftar channel saldo deposit yang diperiksa saat tutup shift.",
    subsections: [
      {
        title: "Buka & Tutup Shift",
        steps: [
          "Buka shift: isi Modal Awal Kas, klik Buka Shift.",
          "Tutup shift: hitung uang fisik di laci SATU PER SATU per pecahan (jangan lihat laporan sistem dulu) — total muncul otomatis saat diisi.",
          "Isi \"Verifikasi Saldo Channel Non-Tunai\": buka app/dashboard tiap channel (GoPay, DANA, BukuPay, Fastpay, dan channel deposit lain yang terdaftar) lalu masukkan saldo yang tertera di sana saat itu juga.",
          "Isi catatan opsional (mis. alasan selisih yang sudah diketahui), lalu klik Tutup Shift — sistem baru menampilkan selisih (kas & non-tunai) SETELAH kamu submit, bukan sebelumnya, supaya hitungan tidak diarahkan ke angka yang \"pas\".",
          "Riwayat shift menampilkan setiap pergantian shift dengan selisih kas & non-tunai ditandai warna: merah \"Kurang\" untuk kekurangan, kuning \"Lebih\" untuk kelebihan.",
        ],
      },
      {
        title: "Kelola Channel Saldo Deposit (Non-Tunai)",
        intro: "Bagian ini menentukan daftar channel yang muncul di Verifikasi Saldo Channel Non-Tunai saat tutup shift.",
        steps: [
          "Channel \"Saldo Deposit Fastpay (PPOB)\" adalah channel bawaan sistem — bisa diganti namanya (klik \"Ganti Nama\") tapi tidak bisa dihapus, karena modul PPOB bergantung padanya.",
          "Untuk menambah channel deposit lain (mis. provider PPOB kedua), isi nama di kolom \"Nama channel saldo deposit baru\" lalu klik \"Tambah Channel\" — sistem otomatis membuatkan akun COA & akun kas/bank sendiri untuk channel ini.",
          "Hapus channel custom (bukan bawaan) dengan tombol Hapus — akun COA yang terkait otomatis ikut dibersihkan (dihapus kalau belum pernah dipakai, diarsipkan kalau sudah ada riwayat transaksi/penutupan shift).",
        ],
        notes: ["Bagian kelola channel ini hanya terlihat untuk akun dengan izin manage_coa (Owner, Superuser, Accountant)."],
      },
    ],
    notes: [
      "Channel non-tunai yang diverifikasi setiap tutup shift: setiap metode pembayaran GoPay/DANA/BukuPay/Fastpay yang benar-benar dipakai shift itu, PLUS setiap channel saldo deposit yang terdaftar (selalu dicek, karena saldo ini adalah float bersama yang bisa terpakai siapa saja).",
      "Angka \"Ekspektasi\" (baik kas maupun non-tunai) dihitung sistem dari saldo akuntansi berjalan — tidak pernah ditampilkan ke kasir sebelum dia submit hitungannya sendiri (blind count).",
    ],
  },

  // ================= PENJUALAN & PELANGGAN =================
  {
    id: "transaksi",
    group: "Penjualan & Pelanggan",
    label: "Transaksi",
    summary:
      "Log pencarian semua transaksi (Rental/F&B/Produk/PPOB) dengan filter lengkap, detail jurnal akuntansi per transaksi, dan aksi refund/void/pelunasan paksa. Ada juga tab Performa Kasir.",
    subsections: [
      {
        title: "Daftar Transaksi",
        steps: [
          "Pakai filter periode (Hari Ini/Kemarin/Minggu/Bulan/Tahun/Custom), Kasir, Jenis, Metode Pembayaran, Status, pencarian nama Customer, dan rentang Min/Max Total.",
          "Klik Detail pada baris mana pun untuk melihat rincian item, pembayaran, DAN jurnal akuntansi yang dihasilkan transaksi itu (akun, debit, kredit, status posted/void) — berguna untuk menelusuri kenapa suatu angka muncul di laporan.",
          "Klik Struk untuk membuka struk yang bisa dicetak.",
          "Refund (butuh izin refund_order) dan Void (butuh izin void_order_direct) meminta alasan dulu — kalau role tidak punya izin langsung, permintaan masuk ke antrean Approval di halaman Staf & Hak Akses.",
          "Tandai Lunas dan Hapus hanya untuk akun Owner/Superuser — Tandai Lunas memaksa order macet jadi lunas (topup cash), Hapus menghapus PERMANEN order beserta jurnalnya (beda dengan Void yang cuma membatalkan, bukan menghapus).",
        ],
      },
      {
        title: "Performa Kasir",
        steps: [
          "Pilih periode, lihat tabel peringkat kasir: jumlah transaksi, total penjualan, rata-rata, rincian per jenis (rental/F&B/produk), diskon, jumlah void, jumlah shift, dan selisih kas (hijau/merah)."
        ],
      },
    ],
    notes: [
      "Melihat halaman ini (dan tab Performa Kasir) butuh izin view_reports — kasir/kitchen biasa TIDAK bisa membuka daftar transaksi meski menu ini terlihat di sidebar mereka.",
      "Tidak ada tombol export CSV/Excel di halaman ini — untuk laporan yang bisa diunduh, pakai halaman Laporan atau Accounting.",
    ],
    roles: "view_reports: Owner, Superuser, Manager, Accountant, Supervisor.",
  },
  {
    id: "ppob",
    group: "Penjualan & Pelanggan",
    label: "PPOB",
    summary:
      "Catat transaksi PPOB (top up e-wallet, token listrik, pulsa, transfer, tarik tunai) lewat Fastpay — tetap satu accounting dengan modul lain, margin & biaya provider terpisah jelas.",
    steps: [
      "Isi form transaksi: kategori, produk (harga & margin default terisi dari Kelola Harga Provider & Margin), nominal, nomor referensi (untuk token/pulsa), akun sumber dana (funding) dan akun penerima (receiving).",
      "Khusus Tarik Tunai, arah akunnya otomatis dibalik: customer terima uang cash, saldo Fastpay yang bertambah (bukan sebaliknya).",
      "Klik \"Kelola Harga Provider & Margin\" untuk atur biaya modal & margin default per produk supaya tidak perlu isi manual tiap transaksi.",
      "Batalkan (void) transaksi kalau salah input — perlu izin manage_ppob. Edit dan Hapus permanen HANYA untuk akun Superuser (beda dengan Batalkan: Hapus menghilangkan total termasuk jurnalnya, tidak bisa dibatalkan).",
      "Kartu ringkasan atas menampilkan Saldo Deposit Fastpay saat ini dan jumlah transaksi periode berjalan — filter tanggal Dari/Sampai tersedia di atas tabel.",
    ],
    notes: [
      "Biaya provider (Fee Outlet Fastpay tier Basic) dibukukan sebagai beban riil terpisah dari margin toko yang kamu atur sendiri — jadi margin yang kamu lihat adalah margin bersih, bukan kotor.",
      "Saldo Deposit Fastpay bisa diganti namanya lewat halaman Shift & Kasir → Kelola Channel Saldo Deposit (perubahan nama otomatis tersinkron ke sini juga).",
      "Modul PPOB bisa dimatikan sepenuhnya lewat Pengaturan → Feature Management kalau outletmu tidak menjual PPOB — begitu dimatikan, menu ini hilang dari sidebar dan transaksi baru tidak bisa dibuat, tapi riwayat transaksi lama tetap tersimpan dan muncul lagi begitu modul dinyalakan ulang.",
    ],
    roles: "Catat/void transaksi & kelola harga: manage_ppob. Edit/Hapus permanen: khusus akun Superuser. Nyala/matikan modul ini: khusus Superuser lewat Feature Management.",
  },
  {
    id: "promo",
    group: "Penjualan & Pelanggan",
    label: "Promo & Paket",
    summary:
      "Kelola paket rental PS harga flat (mis. \"Paket 3 Jam PS4\") yang dipakai di halaman Rental PS. Diskon/voucher belanja ada di menu Membership & CRM, bukan di sini.",
    steps: [
      "Isi Nama paket, Konsol (Semua/PS3/PS4/PS5), Durasi (menit), Harga paket, klik Simpan Paket.",
      "Per kartu paket: Edit (form inline), Nonaktifkan/Aktifkan (sembunyikan dari pilihan tanpa menghapus data), Hapus.",
    ],
    notes: [
      "Kalau sebuah paket sudah pernah dipakai di transaksi/sesi, Hapus otomatis diarahkan jadi Nonaktifkan saja (soft-delete) — supaya riwayat transaksi lama tidak rusak.",
      "Paket ini hanya dipakai dari halaman Rental PS, bukan dari keranjang POS.",
    ],
    roles: "manage_pricing_promo: Owner, Manager, Supervisor (dan Superuser).",
  },
  {
    id: "membership",
    group: "Penjualan & Pelanggan",
    label: "Membership & CRM",
    summary:
      "Database customer dengan poin loyalty & tingkatan (tier) otomatis ATAU berbayar (Cash/QRIS), katalog reward yang bisa ditukar poin, dan voucher diskon belanja mandiri.",
    subsections: [
      {
        title: "Customer",
        steps: [
          "Cari customer di kotak pencarian (nama/HP) atau klik \"Tambah Customer\" (cukup nama + HP).",
          "Klik baris customer untuk buka panel detail: total belanja, poin loyalty, badge tier, riwayat order/sewa/poin, daftar reward yang bisa ditukar (tombol nonaktif otomatis kalau poin belum cukup), dan riwayat redeem.",
          "Tukar Poin (\"Tukar\") menghasilkan kode redeem yang ditampilkan langsung — untuk reward tipe diskon main, kode ini otomatis jadi voucher sekali-pakai yang bisa langsung dipakai customer itu di checkout berikutnya.",
          "Jual/Perpanjang Keanggotaan (kalau ada tier berbayar): pilih tier, pilih Cash atau QRIS, klik \"Bayar & Aktifkan\" — customer langsung pindah ke tier itu dan pembayarannya otomatis tercatat di Accounting (jurnal Dr Kas/Bank, Cr Pendapatan Keanggotaan) serta ikut rekonsiliasi kas shift kalau dibayar cash.",
        ],
        notes: ["Hapus customer dan Tukar Poin hanya terlihat untuk akun Superuser di UI ini. Jual/Perpanjang Keanggotaan butuh izin manage_membership (Owner/Manager/Supervisor/Cashier/Superuser secara default)."],
      },
      {
        title: "Membership Tier",
        steps: [
          "Tambah tier: nama, minimal belanja untuk naik ke tier ini (opsional), Biaya Keanggotaan (opsional — isi supaya tier ini bisa langsung \"dijual\" tanpa menunggu belanja), pengali poin, persen diskon.",
          "Customer naik tier otomatis setiap kali order lunas — sistem mengevaluasi ulang total belanjanya lalu menaikkan ke tier tertinggi yang memenuhi syarat. Tier TIDAK PERNAH turun otomatis dari jalur belanja ini.",
          "Tier dengan Biaya Keanggotaan > 0 juga muncul sebagai pilihan di \"Jual Keanggotaan\" pada detail customer — dua jalur (belanja vs. bayar langsung) bisa berjalan bersamaan untuk tier yang sama.",
        ],
      },
      {
        title: "Reward",
        steps: [
          "Tambah reward: nama, tipe (Belanja Brand Partner atau Diskon Main), poin yang dibutuhkan, lalu field sesuai tipe (nama brand partner, atau jenis+nilai diskon)."
        ],
      },
      {
        title: "Voucher",
        steps: [
          "Isi Kode (otomatis huruf besar), Tipe (Persen/Nominal), Nilai, dan minimal belanja, klik Buat Voucher.",
          "Voucher aktif langsung bisa dipakai di checkout POS maupun Rental PS dengan mengetik kodenya.",
        ],
        notes: ["Tidak ada tombol Edit/Nonaktifkan untuk voucher setelah dibuat — voucher hanya berhenti aktif kalau kuota pemakaiannya habis."],
      },
    ],
    notes: [
      "Poin loyalty didapat otomatis: sekitar 1 poin per Rp10.000 belanja (dikalikan pengali tier), plus bonus poin \"main\" per konsol untuk sesi rental — semua tercatat terpisah di riwayat poin supaya jelas asalnya.",
      "Banyak tombol Edit/Hapus/Redeem di halaman ini hanya terlihat untuk akun Superuser walau secara sistem izin manage_pricing_promo (dipegang Owner/Manager/Supervisor) sebenarnya cukup — kalau kamu Owner dan tombolnya tidak muncul, itu batasan tampilan, bukan error.",
    ],
  },
  {
    id: "chat",
    group: "Penjualan & Pelanggan",
    label: "Customer Service",
    navHint: "Ini BUKAN inbox WhatsApp/Instagram customer — ini tiket bantuan ke tim pusat NEXBILL.",
    summary:
      "Kirim keluhan, saran, atau kendala teknis outlet langsung ke tim NEXBILL/Digitrajasa lewat sistem tiket sederhana.",
    steps: [
      "Klik \"+ Tiket Baru\", isi Judul (opsional), Kategori (Keluhan/Saran/Kendala Teknis/Lainnya), dan Pesan, klik Kirim ke Pusat.",
      "Pilih tiket di daftar kiri untuk membaca percakapannya di panel kanan.",
      "Balas dengan mengetik di kotak \"Balas...\" lalu Enter/klik Kirim.",
    ],
    notes: [
      "Daftar tiket dan pesan otomatis update berkala (polling) — balasan tim NEXBILL akan muncul tanpa perlu refresh manual.",
      "Tidak ada tombol untuk menutup/menyelesaikan tiket dari sisi outlet — status tiket dikendalikan dari sisi tim NEXBILL.",
      "Tim NEXBILL Support membalas tiket dalam Bahasa Indonesia lalu diterjemahkan otomatis oleh AI ke bahasa yang sesuai dengan Negara outletmu (diatur di Pengaturan → Business & Tax) — outlet di Malaysia/Thailand/Filipina/Vietnam otomatis menerima balasan dalam bahasa negaranya masing-masing, tidak perlu diatur terpisah di halaman ini.",
    ],
  },
  {
    id: "notifikasi",
    group: "Penjualan & Pelanggan",
    label: "Notifikasi",
    navHint: "Diakses lewat ikon lonceng di TopBar, bukan lewat sidebar utama.",
    summary:
      "Pusat notifikasi terpadu untuk semua hal yang butuh perhatian: stok menipis, approval tertunda, expense tertunda, booking tertunda, dan status trial langganan.",
    steps: [
      "Filter Semua/Belum Dibaca di atas daftar.",
      "Klik judul notifikasi untuk membuka halaman terkait sekaligus menandainya sudah dibaca, atau klik \"Tandai dibaca\" tanpa pindah halaman.",
      "\"Tandai semua dibaca\" membersihkan semua badge belum-dibaca sekaligus.",
    ],
    notes: [
      "Kategori & ambang batas notifikasi (mis. kapan stok dianggap menipis) sebagian bisa diatur di Pengaturan → tab Notifikasi.",
      "Pengumuman dari tim NEXBILL/Digitrajasa (mis. info maintenance server, promo, kebijakan baru) juga muncul di sini sebagai kategori \"Pengumuman\" — untuk pengumuman yang ditandai penting, sistem juga menampilkannya sebagai popup sekali muncul saat kamu buka dashboard, sampai kamu klik \"Mengerti\".",
    ],
  },

  // ================= INVENTORI & ASET =================
  {
    id: "inventory",
    group: "Inventori & Aset",
    label: "Inventory Control",
    summary:
      "Pusat produk, resep/BOM, supplier, belanja supplier, purchase order, dan stock opname — semua otomatis terhubung ke Accounting.",
    subsections: [
      {
        title: "Produk",
        steps: [
          "Import massal: unduh template Excel, isi, upload — baris dengan SKU yang sudah ada akan DIUPDATE (harga/kategori/dll), tapi STOK TIDAK PERNAH berubah lewat import, harus disesuaikan manual lewat Penyesuaian Barang.",
          "Tambah manual: nama, kategori, harga jual, harga modal (opsional), stok awal, satuan, minimum stok, supplier utama (opsional).",
          "Edit (inline): kategori/harga/harga modal/satuan/minimum stok/supplier utama bisa diubah di sini — nama & stok tidak (stok lewat Penyesuaian Barang).",
          "Penyesuaian Barang: Tambah Unit, Kurangi Unit (alasan Penyesuaian/Selisih atau Rusak/Waste), atau Set ke Jumlah Tertentu (menampilkan selisih lebih/kurang otomatis sebelum disimpan) — murni perubahan qty, tanpa harga beli. Stok bertambah/berkurang langsung, tanpa approval.",
          "Stok yang berdampak ke harga modal (HPP) — pembelian dari supplier — tetap lewat tab Belanja Supplier atau Purchase Order → Terima Barang, bukan Penyesuaian Barang.",
        ],
        notes: [
          "Tombol Hapus (soft-delete, riwayat order tetap aman) hanya terlihat untuk akun Superuser.",
          "Minimum stok + supplier utama dipakai oleh Purchase Order untuk auto-buat draft PO — lihat subsection Purchase Order.",
        ],
      },
      {
        title: "Resep / BOM",
        steps: [
          "Pilih mode: buat Produk Baru (otomatis masuk kategori Makanan) atau pakai Produk Food yang sudah ada (yang belum punya resep).",
          "Isi nama resep, yield (berapa porsi per satu batch masak), lalu tambahkan minimal 1 bahan (produk bahan baku + qty per yield + satuan) via \"+ Tambah Bahan\", klik Simpan Resep.",
          "Setelah tersimpan, HPP per porsi otomatis dihitung dari total biaya bahan dibagi yield — setiap kali produk jadi ini terjual, stok BAHAN yang berkurang, bukan stok produk jadi.",
        ],
        notes: ["Satu produk hanya boleh punya satu resep. Edit/Hapus resep hanya terlihat untuk akun Superuser."],
      },
      {
        title: "Supplier",
        steps: ["CRUD sederhana: nama, telepon, alamat, termin pembayaran (hari)."],
        notes: ["Hapus adalah hard-delete dan akan gagal kalau supplier masih punya invoice/PO yang mengacu ke dia — hanya terlihat untuk akun Superuser."],
      },
      {
        title: "Belanja Supplier",
        steps: [
          "Untuk produk siap-jual yang dibeli langsung (bukan bahan baku lewat PO). Pilih supplier, susun keranjang belanja (produk, qty, harga beli), opsional tambahkan biaya Transport/Parkir/Lain-lain.",
          "Centang \"Dibayar cash sekarang\" kalau langsung lunas, biarkan kosong untuk dicatat sebagai hutang.",
          "Klik Simpan Belanja — biaya transport/parkir/lain-lain otomatis diproporsikan ke tiap item, memperbarui harga modal (HPP) produk supaya mencerminkan biaya logistik juga.",
        ],
      },
      {
        title: "Purchase Order",
        steps: [
          "\"Produk Perlu Restock\" di atas menampilkan semua produk yang stoknya sudah di titik minimum atau di bawahnya — klik \"+ Isi ke form PO\" untuk mengisi form Buat PO otomatis (qty saran + supplier utama produk itu, kalau ada).",
          "\"Cek & Buat PO Otomatis\": untuk setiap produk di bawah minimum YANG SUDAH punya Supplier Utama (diatur di tab Produk), sistem otomatis membuat/menambah draft PO ke supplier itu — tidak akan membuat item duplikat kalau produknya sudah ada di PO terbuka lain. PO hasil ini ditandai badge \"Auto: Stok Minimum\" dan tetap harus direview/dikirim manual oleh staff.",
          "Pengecekan otomatis ini juga langsung berjalan setiap kali ada Penyesuaian Barang atau Stock Opname yang membuat sebuah produk turun ke/bawah minimumnya — tombol di atas untuk memicu ulang secara manual (mis. setelah penjualan menurunkan stok).",
          "Buat PO manual: pilih supplier, susun keranjang (produk, qty, harga beli), klik Buat PO.",
          "\"Terima Barang\" pada PO yang pending: stok otomatis bertambah sesuai qty diterima, status PO jadi Diterima/Diterima Sebagian, dan invoice hutang ke supplier otomatis dibuat (belum dibayar).",
        ],
      },
      {
        title: "Stock Opname",
        steps: [
          "Isi hasil hitung fisik per produk di samping angka sistem — selisih lebih/kurang langsung ditampilkan saat mengetik, klik Simpan Hasil Hitung (tersimpan sebagai draft, mencatat angka sistem SAAT ITU sebagai pembanding).",
          "Klik nama opname di daftar bawah untuk membuka rincian selisih per produk (sistem vs fisik vs selisih lebih/kurang) sebelum diterapkan.",
          "Klik Terapkan Penyesuaian untuk mengunci hasil — selisih lebih jadi penyesuaian (adjustment), selisih kurang jadi waste. Tidak bisa diterapkan dua kali untuk opname yang sama. Kalau ada produk yang jadi di bawah minimum setelah diterapkan, sistem otomatis mengecek Purchase Order juga.",
        ],
      },
    ],
    notes: [
      "Sebagian besar aksi mutasi (import, tambah produk/resep, PO, stock opname) butuh izin manage_inventory_purchasing (Owner, Manager). Tombol Hapus destruktif tambahan dibatasi hanya untuk akun Superuser di UI.",
    ],
  },
  {
    id: "assets",
    group: "Inventori & Aset",
    label: "Fixed Asset",
    summary:
      "Daftar aset tetap (unit PS, TV, controller, furnitur, kendaraan) dengan penyusutan garis lurus otomatis dan pencatatan pelepasan aset.",
    subsections: [
      {
        title: "Daftar Aset",
        steps: [
          "Klik + Aset Baru: nama, kategori, unit PS terkait (opsional), harga perolehan, nilai sisa, umur ekonomis (bulan), supplier (opsional), metode bayar + akun kas/bank ATAU centang \"Catat sebagai hutang\".",
          "+ Maintenance pada aset aktif: deskripsi & biaya, opsional centang \"Buat Expense\" supaya biayanya otomatis tercatat juga di Expense Management, terhubung ke aset ini.",
          "Lepas Aset (dispose): isi hasil pelepasan (0 kalau tidak ada), akun kas/bank (wajib kalau ada hasil), dan alasan — sistem otomatis hitung untung/rugi pelepasan dan posting jurnalnya sendiri.",
        ],
      },
      {
        title: "Penyusutan",
        steps: [
          "Pilih periode (bulan), lihat estimasi total penyusutan bulan itu, klik Jalankan Penyusutan.",
          "Proses ini AMAN dijalankan berkali-kali — aset yang periodenya sudah diproses atau sudah lunas susut otomatis dilewati (tidak dobel), sisanya tetap diproses.",
          "Riwayat Penyusutan di bawah menampilkan semua entri penyusutan yang pernah diposting.",
        ],
      },
    ],
    notes: ["Semua aksi mutasi butuh izin manage_assets (Owner, Manager, Accountant)."],
  },
  {
    id: "maintenance",
    group: "Inventori & Aset",
    label: "Maintenance",
    summary:
      "Tiket perbaikan untuk TV, konsol/PlayStation, controller & aksesoris lain dengan alur Masuk Maintenance → Proses → Selesai, plus ringkasan jumlah aset per kategori vs. yang sedang diperbaiki.",
    subsections: [
      {
        title: "Tiket Maintenance",
        steps: [
          "+ Tambah Maintenance: pilih aset (dari daftar Aset), isi deskripsi kerusakan & biaya, opsional centang \"Buat Expense\" supaya biayanya tercatat juga di Expense Management.",
          "Tiket baru otomatis berstatus \"Masuk Maintenance\" dan aset terkait otomatis ditandai \"Maintenance\" di halaman Aset — jadi tidak kelihatan seperti aset aktif biasa.",
          "Klik \"Mulai Proses\" untuk pindah ke status Proses, lalu \"Tandai Selesai\" saat perbaikan selesai — aset otomatis kembali \"Aktif\" begitu tidak ada tiket lain yang masih terbuka untuknya.",
          "Edit: ubah deskripsi/biaya kapan saja — biaya terkunci kalau tiketnya sudah dibuatkan Expense (ubah nominalnya lewat halaman Expense).",
          "Hapus: hanya bisa untuk tiket yang belum dibuatkan Expense, supaya jejak akuntansi tidak putus.",
        ],
      },
      {
        title: "Ringkasan per Kategori",
        steps: [
          "Card di atas daftar tiket menampilkan, per kategori (PlayStation/Konsol, TV, Controller/Aksesoris, dst): berapa unit tersedia vs. total aset terdaftar (tidak termasuk yang sudah dilepas/disposed), dan berapa yang sedang maintenance.",
        ],
      },
    ],
    notes: ["Semua aksi mutasi butuh izin manage_assets (Owner, Manager, Accountant) — sama seperti halaman Aset."],
  },

  // ================= KEUANGAN & AKUNTANSI =================
  {
    id: "accounting",
    group: "Keuangan & Akuntansi",
    label: "Accounting",
    summary:
      "Pusat pembukuan double-entry lengkap: Chart of Accounts, Account Mapping, Jurnal, Neraca Saldo, Piutang/Hutang, Laba Rugi, Neraca, Arus Kas, dan Migrasi Data.",
    subsections: [
      {
        title: "Chart of Accounts (COA)",
        steps: [
          "Cari/filter akun by kode/nama/tipe. Toggle Tree (hierarki) atau List (datar).",
          "+ Akun Baru: kode, nama, tipe, akun induk (opsional), centang \"Posting Account\" (uncheck untuk jadikan akun Header/pengelompok saja), cost center opsional.",
          "Edit/Arsipkan/Hapus per akun — akun yang sudah pernah dipakai di jurnal otomatis DIARSIPKAN (bukan dihapus permanen) saat diminta hapus, supaya riwayat tetap valid.",
        ],
        notes: [
          "Akun Header (Posting Account tidak dicentang) tidak bisa menerima jurnal sama sekali — hanya untuk mengelompokkan akun anak secara visual.",
          "Kode akun tidak bisa diubah lagi setelah pernah dipakai posting jurnal.",
        ],
      },
      {
        title: "Account Mapping",
        steps: [
          "Menentukan akun tujuan default untuk tiap kombinasi modul+jenis transaksi (mis. Rental PS4 → akun 4110) supaya kasir/modul lain tidak perlu pilih akun manual.",
          "+ Mapping Baru: pilih Module, isi Transaction Key, pilih akun tujuan (hanya akun posting yang aktif), opsional label.",
          "Kirim ulang kombinasi module+key yang sama akan MENGGANTI target akun yang lama (bukan error duplikat) — jadi cara mengubah mapping ya submit ulang dengan akun baru.",
        ],
      },
      {
        title: "Jurnal",
        steps: [
          "Filter berdasarkan sumber transaksi (Manual, Rental, POS, Purchase, Expense, Refund, Aset, Penyusutan, Pelunasan Piutang, Saldo Awal, PPOB).",
          "+ Jurnal Manual (butuh izin post_manual_journal): isi tanggal, referensi opsional, deskripsi, lalu baris debit/kredit (minimal 2 baris) — total debit harus sama dengan total kredit sebelum tombol Posting Jurnal aktif.",
          "Batalkan (khusus entri manual, butuh izin sama): minta alasan, lalu sistem membuat entri PEMBALIK yang persis kebalikan dari entri asli — entri asli tidak dihapus, hanya ditandai VOID, supaya riwayat tetap utuh dan seimbang.",
        ],
        notes: ["Entri otomatis (dari POS/Rental/Expense/dll) tidak bisa dibatalkan dari tab ini — pembatalannya lewat modul asalnya masing-masing (mis. Refund di Transaksi, Void Expense di Expense Management)."],
      },
      {
        title: "Neraca Saldo (Trial Balance)",
        steps: [
          "Pilih periode (default Bulan Ini). PENTING: kalau mau lihat saldo KUMULATIF sejak awal (bukan cuma aktivitas bulan ini), pilih Custom dan kosongkan kedua tanggal.",
          "Centang \"Tampilkan akun bersaldo nol\" untuk melihat semua akun termasuk yang belum ada aktivitas.",
          "Download Excel/PDF tersedia di tab ini.",
        ],
        notes: ["Indikator \"TIDAK BALANCE\" di footer berarti ada masalah integritas jurnal yang perlu ditelusuri — seharusnya selalu balance."],
      },
      {
        title: "Piutang (AR) & Hutang (AP)",
        steps: [
          "Piutang: daftar tagihan customer yang belum lunas dengan aging (Belum jatuh tempo / 1-30 hari / 31-60 hari / >60 hari). Klik \"Terima Bayar\" untuk mencatat pelunasan langsung dari sini.",
          "Hutang: gabungan hutang supplier (dari Purchase Order/Belanja Supplier) dan expense yang dicatat sebagai hutang — sama-sama ada aging. Klik Bayar, pilih akun kas/bank, selesai.",
        ],
      },
      {
        title: "Laba Rugi (P&L)",
        steps: [
          "Pilih periode, lihat Total Pendapatan, Laba Kotor, Laba Bersih, dan rincian per akun pendapatan/beban. Download Excel/PDF tersedia.",
          "Aktifkan \"Bandingkan Multi-Periode\" untuk membandingkan 2-4 periode berdampingan dalam satu tabel (mis. bulan ini vs bulan lalu vs tahun lalu bulan yang sama).",
        ],
      },
      {
        title: "Neraca (Balance Sheet)",
        steps: ["Pilih \"Per Tanggal\" (kosongkan untuk hari ini) — ini snapshot per satu titik waktu, bukan rentang tanggal. Download Excel/PDF tersedia."],
        notes: ["Indikator \"TIDAK BALANCE\" berarti Aset tidak sama dengan Liabilitas+Ekuitas — biasanya karena akun salah dikategorikan tipe-nya atau Saldo Awal belum lengkap."],
      },
      {
        title: "Arus Kas (Cash Flow)",
        steps: ["Pilih periode, lihat Kas Masuk, Kas Keluar, Arus Kas Bersih, rincian per kategori, dan tabel harian. Download Excel/PDF tersedia."],
        notes: ["Ini metode langsung (direct method) berbasis kas yang benar-benar berpindah — bukan akrual."],
      },
      {
        title: "Migrasi Data",
        navHint: "Tab ini hanya terlihat untuk akun Owner/Superuser.",
        steps: [
          "Saldo Awal: catat saldo pembukaan semua akun (Kas, Piutang, Hutang, Aset, Modal, dll) per tanggal cutover dalam satu jurnal seimbang — cara standar mulai pakai NEXBILL tanpa harus input ulang seluruh histori transaksi. Klik \"Muat Semua Akun Postable\" untuk isi baris otomatis per akun. Hanya boleh ada SATU Saldo Awal aktif — untuk koreksi, batalkan dulu (perlu alasan) baru posting ulang.",
          "Impor Data Historis (Excel): unduh template per kategori (Penjualan, Pembelian, Pendapatan Lain-lain, Pengeluaran), isi, upload untuk mengimpor transaksi lama bertanggal secara massal supaya tren histori tetap muncul di Laba Rugi.",
        ],
        notes: [
          "PENTING: data yang diimpor lewat Penjualan/Pembelian/Pengeluaran langsung masuk jurnal akuntansi TAPI TIDAK muncul di daftar Transaksi/Purchasing/Expense Management — hanya di Accounting & Laporan. Khusus Pendapatan Lain-lain, datanya muncul di kedua tempat karena memakai jalur pencatatan yang sama persis dengan input manual.",
          "Disarankan: lakukan Saldo Awal dulu untuk Neraca yang benar, baru opsional lanjut Impor Data Historis kalau butuh tren laporan historis juga.",
        ],
      },
    ],
    notes: [
      "Siapa pun staf yang login BISA MELIHAT semua tab & data di halaman ini — pembatasan hanya berlaku untuk aksi mengubah data.",
      "Mengedit COA/Account Mapping butuh izin manage_coa (Owner, Superuser, Accountant). Posting/batalkan jurnal manual & Saldo Awal butuh izin post_manual_journal (Owner, Superuser, Accountant). Manager BISA LIHAT semuanya tapi TIDAK BISA mengedit apa pun di Accounting.",
    ],
  },
  {
    id: "expenses",
    group: "Keuangan & Akuntansi",
    label: "Expense Management",
    summary:
      "Catat & setujui pengeluaran outlet — setiap expense yang disetujui otomatis posting jurnal ke akuntansi. Ada juga Cost Center dan template biaya berulang (Recurring).",
    subsections: [
      {
        title: "Catat & Setujui Expense",
        steps: [
          "+ Expense Baru: pilih Akun Beban (COA), Kategori, deskripsi, payee/supplier opsional, qty, nominal, pajak opsional, cost center opsional, unit PS terkait opsional, metode pembayaran + akun kas/bank (atau centang \"Catat sebagai hutang\"), jatuh tempo kalau hutang, lampiran foto opsional.",
          "Klik Simpan & Submit. Kalau nominal (termasuk pajak) di bawah batas approval outlet (default Rp500.000, bisa diubah di Pengaturan → Business & Tax), langsung disetujui otomatis dan jurnal langsung terposting. Kalau melebihi, statusnya jadi Pending Approval menunggu orang dengan izin approve_expenses.",
          "Yang berwenang bisa Setujui atau Tolak (perlu alasan) baris pending.",
          "Expense yang dicatat sebagai hutang, setelah disetujui, muncul tombol Bayar — pilih akun kas/bank & metode untuk melunasinya.",
          "Draft/pending bisa dibatalkan (Cancel) tanpa bekas jurnal. Expense yang sudah diposting (approved/paid) hanya bisa dibatalkan lewat Void (butuh izin void_expense, perlu alasan) — ini membuat jurnal pembalik, bukan menghapus.",
        ],
      },
      {
        title: "Cash Out Cepat",
        steps: ["Form pintas 3 kolom (kategori, nominal, catatan) untuk pengeluaran kecil sehari-hari (parkir, galon air) — tetap tunduk pada aturan batas approval yang sama."],
      },
      {
        title: "Cost Center",
        steps: ["CRUD nama + kode opsional untuk membagi biaya per divisi/area (Rental, F&B, Dapur, Administrasi) — dipakai untuk rincian \"biaya per cost center\" di Laporan."],
      },
      {
        title: "Recurring (Biaya Berulang)",
        steps: [
          "Buat template: nama, akun, kategori, nominal, frekuensi (Bulanan/Mingguan/Tahunan), tanggal jatuh tempo berikutnya, centang \"catat sebagai hutang\" kalau perlu.",
          "Klik \"Generate Expense yang Jatuh Tempo\" untuk memindai template yang sudah waktunya dan otomatis membuat draft expense — draft ini tetap perlu di-Submit manual seperti expense biasa.",
        ],
      },
    ],
    notes: [
      "Dashboard tab menampilkan KPI Hari Ini/Bulan Ini/Outstanding/Pending Approval/Jatuh Tempo ≤3 hari, plus rincian per kategori, cabang, dan tren 30 hari.",
    ],
    roles: "manage_expenses (catat/submit/bayar di bawah batas): Owner, Superuser, Manager, Accountant, Cashier. approve_expenses (setujui di atas batas): Owner, Superuser, Manager. void_expense: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "other-income",
    group: "Keuangan & Akuntansi",
    label: "Pendapatan Lain-lain",
    summary:
      "Catat pemasukan di luar penjualan POS/Rental/F&B/PPOB — komisi vendor, sewa aset ke pihak lain, penjualan aset, sponsorship, kompensasi/denda dari customer, bunga/cashback bank, dan lainnya.",
    steps: [
      "Atur rentang tanggal (atau klik cepat Hari Ini/Bulan Ini).",
      "Isi form: Kategori, Deskripsi, \"Diterima dari\" opsional, Nominal, Metode Pembayaran, klik Simpan.",
      "Entri langsung terposting ke akuntansi begitu disimpan — tidak ada langkah approval seperti Expense.",
      "Kalau ada shift kasir yang sedang aktif saat mencatat, entri cash otomatis ikut masuk hitungan rekonsiliasi kas shift itu.",
      "Void (perlu alasan) tersedia untuk membatalkan entri yang salah.",
    ],
    notes: ["Staf yang hanya punya izin view_reports (tanpa manage_other_income) bisa melihat daftar tapi tidak bisa mencatat/membatalkan."],
    roles: "manage_other_income: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "payments-methods",
    group: "Keuangan & Akuntansi",
    label: "Metode Pembayaran",
    navHint: "Menu \"Pembayaran\" di sidebar.",
    summary:
      "Kelola daftar metode pembayaran yang muncul sebagai pilihan di kasir/rental/pendapatan lain-lain — bisa tambah metode custom, atur jenisnya, aktif/nonaktifkan.",
    steps: [
      "+ Metode: isi nama, pilih Jenis — \"Info Saja\" (langsung masuk bank/EDC, tanpa cek saldo, mis. Kartu/Transfer) atau \"Saldo Terlacak\" (perlu cek saldo app saat tutup shift, mis. GoPay/DANA custom lainnya).",
      "Edit untuk ubah nama/jenis/status aktif. \"Key\" internal metode bersifat permanen sejak dibuat (tidak bisa diubah) karena riwayat transaksi lama menyimpannya sebagai referensi.",
      "Hapus hanya menghilangkan metode dari pilihan baru ke depan — transaksi lama yang sudah pakai metode itu tidak terpengaruh.",
    ],
    notes: [
      "Metode \"Tunai (Cash)\" tidak bisa dihapus dan jenisnya tidak bisa diubah — dibutuhkan sistem untuk hitung fisik kas saat tutup shift.",
      "Di bagian bawah ada URL webhook Fastpay/BukuPay untuk didaftarkan ke dashboard payment gateway kalau kredensial live sudah dikonfigurasi.",
    ],
    roles: "manage_settings: Owner, Superuser, Manager.",
  },
  {
    id: "reports",
    group: "Keuangan & Akuntansi",
    label: "Laporan",
    summary:
      "Laporan operasional per rentang tanggal — beda dari laporan keuangan formal (P&L/Neraca/Arus Kas ada di menu Accounting, bukan di sini).",
    subsections: [
      { title: "Penjualan", steps: ["Total pendapatan + split Rental/POS, jumlah order lunas, grafik tren harian, rincian per metode pembayaran, total diskon/pajak/service charge."] },
      { title: "Rental", steps: ["Total pendapatan rental, jumlah sesi selesai, rata-rata durasi, dan tabel per unit PS (jumlah sesi, durasi rata-rata, pendapatan)."] },
      { title: "Home Rental", steps: ["Total pendapatan & transaksi sewa dibawa pulang, denda keterlambatan, penggantian kerusakan; rincian per kategori pendapatan (12/24 jam, mingguan, antar-jemput, dll), per tipe produk, dan laporan status deposit."] },
      { title: "Inventori & HPP", steps: ["Pendapatan produk, total HPP, margin kotor; tabel margin per produk; daftar waste/kerusakan stok; daftar stok menipis saat ini."] },
      { title: "Pelanggan", steps: ["Total pelanggan terdaftar, distribusi tier membership, tabel top pelanggan (total belanja, poin, kunjungan)."] },
      { title: "Beban (Expense)", steps: ["Laporan paling lengkap: total expense, total revenue, rasio expense-to-revenue, laba bersih; grafik tren; rincian per kategori/akun/supplier/metode bayar/cabang/cost center; tabel detail (100 baris pertama)."] },
    ],
    notes: [
      "Semua tab punya date range picker sendiri (default: tanpa filter/semua waktu) — bukan satu filter global untuk semua tab.",
      "Tidak ada tombol export di halaman ini — kalau butuh file Excel/PDF, itu ada di halaman Accounting (Neraca Saldo, Laba Rugi, Neraca, Arus Kas).",
      "Bisa diakses siapa saja yang login — tidak ada pembatasan izin khusus di halaman ini.",
    ],
  },

  // ================= MANAJEMEN & SISTEM =================
  {
    id: "staff",
    group: "Manajemen & Sistem",
    label: "Staf & Hak Akses",
    summary:
      "Kelola akun staf & role mereka, proses permintaan approval (void/refund yang butuh persetujuan), lihat jejak audit, dan (khusus Superuser) edit matriks izin per role.",
    subsections: [
      {
        title: "Daftar Staf",
        steps: [
          "Tambah Staf: nama, email, password, pilih Role (semua role kecuali Superuser — role itu tidak bisa diberikan lewat sini).",
          "Ubah role staf langsung dari dropdown di tabel. Nonaktifkan/Aktifkan untuk suspend akun sementara tanpa menghapus data.",
          "Hapus (hard delete, permanen) hanya untuk akun dengan izin manage_admin_data — tidak bisa menghapus akun yang sedang login sendiri.",
        ],
        notes: ["Hanya akun Owner/Superuser yang bisa membuat/mengubah staf lain menjadi role \"Owner\" — mencegah Manager biasa membuat rekan pemilik baru."],
      },
      {
        title: "Approval",
        steps: [
          "Ajukan Void/Batalkan Order: masukkan Order ID + alasan — kalau kamu punya izin void_order_direct, langsung tereksekusi; kalau tidak, masuk antrean menunggu persetujuan.",
          "Daftar Permintaan menampilkan semua permintaan approval (jenis, referensi, pemohon, alasan, status) — yang punya izin approve_requests bisa Setujui/Tolak.",
        ],
      },
      { title: "Audit Log", steps: ["Feed kronologis semua aktivitas tercatat (waktu, aksi, entitas, detail) — murni untuk transparansi, tidak ada aksi di tab ini."] },
      {
        title: "Role & Izin",
        navHint: "Tab ini hanya terlihat untuk akun Superuser.",
        steps: [
          "Matriks lengkap: baris = setiap izin (dikelompokkan per kategori — Umum, Kasir & Transaksi, dll), kolom = setiap role.",
          "Centang/hilangkan centang untuk langsung mengubah hak akses role tersebut di seluruh outlet ini — berlaku seketika.",
          "Klik \"reset\" per role untuk mengembalikan ke pengaturan bawaan sistem.",
        ],
        notes: ["Satu sel terkunci permanen: izin \"manage_staff\" milik Superuser tidak bisa dicabut — supaya Superuser tidak pernah terkunci dari halaman ini sendiri."],
      },
    ],
    notes: [
      "Kalau kamu owner outlet dan tidak melihat tab \"Role & Izin\", itu memang disengaja — hanya akun dengan role persis Superuser yang bisa mengedit matriks izin.",
    ],
  },
  {
    id: "ai",
    group: "Manajemen & Sistem",
    label: "AI Business Intelligence",
    summary:
      "Tanya-jawab bisnis dengan AI yang bisa membaca data live outletmu, plus panel analisa otomatis (tren, forecast, deteksi anomali) tanpa perlu tanya AI.",
    subsections: [
      {
        title: "Asisten Bisnis",
        steps: [
          "Ketik pertanyaan bebas atau klik salah satu 4 saran pertanyaan (pendapatan bulan ini, biaya operasional terbesar, laba rugi 30 hari, unit PS paling menguntungkan).",
          "AI akan mengambil data live (terlihat sebagai \"Mengecek {data}...\" saat berpikir) mencakup penjualan, rental, biaya, laba rugi, arus kas, inventori, aset.",
        ],
      },
      {
        title: "Insight & Analisa",
        steps: [
          "Panel ini murni komputasi (bukan panggilan AI, jadi gratis/instan): tren 30 hari revenue/expense, forecast 7 hari ke depan, deteksi anomali biaya, dan anomali revenue harian.",
          "Klik \"Generate Rekomendasi\" untuk memicu satu panggilan AI menghasilkan paragraf rekomendasi naratif — sengaja tidak otomatis jalan saat halaman dibuka supaya biaya terkendali.",
        ],
      },
    ],
    notes: [
      "Fitur ini dibatasi HANYA untuk akun Owner dan Superuser — role lain (Manager, Accountant, dll) tidak bisa mengaksesnya sama sekali, walau punya izin view_reports.",
      "Gratis dipakai selama masa trial langganan. Setelah trial habis, butuh AI Add-on aktif (biaya terpisah dari langganan dasar) karena setiap panggilan memakai token Claude API sungguhan — kecuali akun Superuser yang dibebaskan dari pengecekan ini.",
    ],
  },
  {
    id: "billing-subscription",
    group: "Manajemen & Sistem",
    label: "Langganan NEXBILL",
    navHint: "Menu \"Langganan\" di sidebar — ini tagihan outletmu KE NEXBILL, bukan pendapatan outlet.",
    summary:
      "Status & pembayaran langganan aplikasi NEXBILL sendiri untuk outlet ini, plus toko perangkat tambahan (smart plug, instalasi, slot konsol) dan AI Add-on.",
    steps: [
      "Belanja perangkat/jasa: pilih item di storefront (Smart Plug, Jasa Instalasi, Konsol Tambahan), atur qty, checkout — nanti muncul satu invoice gabungan (biaya langganan + item yang dipilih).",
      "Bayar invoice: pilih Cash, QRIS, atau salah satu dari 5 bank Virtual Account. Setelah transfer, klik \"Tandai Lunas\" untuk konfirmasi (khusus cash akan diminta konfirmasi ulang).",
      "Kalau sudah aktif dan tidak ada invoice pending, tombol \"Perpanjang Sekarang\" tersedia untuk membuat tagihan periode berikutnya kapan saja (tidak perlu menunggu tanggal jatuh tempo otomatis).",
      "AI Add-on adalah produk terpisah dari paket dasar — gratis otomatis selama trial 30 hari, setelah itu perlu diaktifkan/diperpanjang sendiri dengan biaya bulanan tersendiri.",
    ],
    notes: [
      "Selama masa trial, sebagian fitur dibatasi: smart plug belum bisa ditambah sama sekali (harus beli dulu), kontrol Android TV dibatasi maksimal 1 unit — semua terbuka penuh setelah langganan dibayar.",
      "Kalau outlet ini tergabung dalam satu billing group (multi-outlet), satu invoice/pembayaran memperpanjang SEMUA outlet anggota grup sekaligus — akan terlihat daftarnya di kartu billing group.",
      "Halaman ini SELALU terpisah dari pendapatan outlet/merchant — apa pun yang dibayar di sini adalah biaya outlet KE NEXBILL, tidak pernah tercatat sebagai pendapatan di Accounting outletmu.",
      "Outlet di luar Indonesia (ditentukan dari Negara yang diatur di Pengaturan → Business & Tax) otomatis melihat harga dalam mata uang lokalnya (USD/MYR/THB/VND/PHP) alih-alih Rupiah, dikonversi memakai kurs terkini — tagihan tetap resmi dicatat dalam Rupiah, konversi ini murni tampilan. Metode pembayaran tambahan \"Bayar Kartu\" muncul khusus untuk outlet mancanegara ini, memakai jaringan kartu internasional lewat iPaymu Cross-Border.",
    ],
    roles: "manage_settings: Owner, Superuser, Manager.",
  },
  {
    id: "referral",
    group: "Manajemen & Sistem",
    label: "Program Referral",
    navHint: "Menu \"Program Referral\" di sidebar, juga ada tautan cepat dari halaman Langganan NEXBILL.",
    summary:
      "Ajak outlet/merchant lain daftar ke NEXBILL pakai kode referral outletmu — mereka dapat diskon 20% untuk pembayaran langganan pertamanya, kamu dapat komisi berulang setiap kali outlet yang kamu ajak itu bayar langganan bulanannya, selama langganannya masih aktif.",
    subsections: [
      {
        title: "Kode & Link Referral",
        steps: [
          "Setiap outlet otomatis mendapat kode referral unik sendiri sejak pertama kali daftar — tidak perlu didaftarkan manual.",
          "Bagikan link \"?ref=KODE\" (tersedia tombol salin di halaman ini) ke calon merchant lain — begitu mereka daftar lewat link itu, otomatis tercatat sebagai referral outletmu.",
          "Referee (outlet yang diajak) otomatis mendapat diskon 20% khusus untuk pembayaran pertama paket langganannya.",
        ],
      },
      {
        title: "Tingkatan (Tier) & Komisi",
        steps: [
          "Tier \"Customer\" (bawaan semua outlet): komisi 20% dari setiap pembayaran langganan bulanan outlet yang diajak, selama langganan referee itu masih aktif.",
          "Tier \"Affiliate\" dan \"Master Partner\" (persentase komisi lebih tinggi — 27% dan 35%) hanya diberikan manual oleh tim NEXBILL untuk partner/kreator yang aktif mengajak banyak outlet — tidak bisa diajukan sendiri dari halaman ini.",
          "Komisi dihitung otomatis setiap kali invoice langganan outlet yang diajak berhasil dibayar — tidak perlu klaim manual.",
        ],
      },
      {
        title: "Saldo & Pencairan Komisi",
        steps: [
          "Kartu ringkasan menampilkan Total Komisi (sepanjang waktu) dan Saldo Tersedia (belum dicairkan).",
          "Pencairan komisi dilakukan MANUAL oleh tim NEXBILL, 1x seminggu setiap hari Senin — bukan otomatis transfer harian/real-time.",
          "Pastikan Rekening Bank sudah diisi lengkap di Pengaturan → Business & Tax SEBELUM jadwal pencairan berikutnya, supaya tidak tertunda — halaman ini akan mengingatkan kalau rekening belum diisi.",
          "Riwayat pencairan (tanggal, nominal, metode) tercatat di bawah, beserta daftar outlet yang berhasil kamu ajak dan status langganan mereka masing-masing.",
        ],
      },
    ],
    notes: [
      "Komisi HANYA dihitung dari pembayaran langganan NEXBILL outlet yang kamu ajak — bukan dari omzet/penjualan bisnis mereka sendiri.",
      "Kalau outlet yang kamu ajak berhenti berlangganan (churn), komisi berulang untuk outlet itu otomatis berhenti sampai mereka aktif lagi.",
      "Saldo & riwayat komisi tidak pernah tercampur ke Accounting outlet lain — murni pencatatan terpisah antara outletmu dan NEXBILL.",
    ],
  },
  {
    id: "rekomendasi-produk",
    group: "Manajemen & Sistem",
    label: "Rekomendasi Produk",
    navHint: "Tautan \"Rekomendasi Produk\" di halaman Langganan NEXBILL.",
    summary:
      "Katalog perlengkapan rental pilihan (konsol, aksesoris, furnitur booth, dll) dengan link belanja langsung ke Shopee — murni referensi belanja, bukan bagian dari keranjang/checkout NEXBILL.",
    steps: [
      "Jelajahi produk per kategori, klik kartu produk untuk membuka link belanjanya di Shopee (tab baru).",
      "Harga yang tertampil adalah label harga referensi saat produk didaftarkan tim NEXBILL — bisa berbeda dari harga aktual di Shopee saat kamu klik, selalu cek harga final di halaman Shopee-nya.",
    ],
    notes: [
      "Pembelian lewat halaman ini dilakukan langsung di Shopee (di luar NEXBILL) — tidak masuk ke invoice Langganan NEXBILL atau ke Accounting outletmu secara otomatis.",
      "Daftar produk dikurasi & dikelola oleh tim NEXBILL dari platform-admin — outlet tidak bisa menambah/mengedit produk di katalog ini sendiri.",
    ],
  },
  {
    id: "settings",
    group: "Manajemen & Sistem",
    label: "Pengaturan",
    summary:
      "Semua pengaturan tingkat outlet: profil bisnis & pajak, cabang, satuan, banner iklan, notifikasi, printer, feature management, audit log, dan reset data.",
    subsections: [
      {
        title: "Business & Tax",
        steps: [
          "Profil Bisnis: nama, logo, telepon, alamat, Negara (menentukan mata uang tampilan Billing & bahasa terjemahan otomatis balasan Support — lihat kategori Langganan NEXBILL dan Customer Service), Provinsi, Kota, Kode Pos, WiFi SSID/password (ditampilkan ke customer, mis. di struk/halaman booking).",
          "Pajak & Billing: persen pajak, persen service charge, pembulatan billing (menit), batas approval expense otomatis.",
          "Target Penjualan (BEP): target omzet bulanan — otomatis dipecah ke target harian dan ditampilkan di widget Ringkasan.",
          "Booking/Reservasi: buffer antar booking, auto-release kalau belum check-in, minimal lead time booking online/WA, toggle terima booking online, dan link halaman booking publik outlet (bisa disalin/dibagikan).",
          "Rekening Bank (untuk Pencairan Komisi Referral): negara, bank (dari daftar bank Asia Tenggara — kalau tidak ada di daftar, pilih \"Bank lainnya\" untuk isi manual), kode SWIFT/BIC (otomatis terisi saat pilih bank, tetap bisa diedit), nomor rekening, dan nama pemilik rekening. Dipakai tim NEXBILL untuk transfer komisi program referral — lihat kategori Program Referral.",
          "Footer Struk: teks bebas di bagian bawah struk, berlaku sama untuk semua komputer di outlet ini.",
          "Printer: lihat kategori \"Pengaturan Printer\" tersendiri di bawah.",
        ],
      },
      { title: "Cabang", steps: ["Tambah cabang baru (nama, alamat, telepon). Klik \"Pakai Cabang Ini\" pada cabang mana pun untuk menjadikannya outlet aktif kamu saat ini — semua halaman lain otomatis mengikuti. Edit profil & nonaktifkan/aktifkan cabang ada di halaman Semua Outlet."] },
      { title: "Satuan", steps: ["CRUD satuan (pcs, gram, kg, dll) yang dipakai di dropdown Produk, Resep/BOM, Belanja Supplier, dan Purchase Order — supaya semua konsisten."] },
      { title: "Banner Iklan", steps: ["Upload gambar banner (rasio 16:5 di HP, 21:6 di layar lebar, resolusi disarankan min 1600×500px) untuk slideshow di halaman booking publik — atur urutan tampil, link tujuan saat diklik, aktif/nonaktifkan."] },
      { title: "Notifikasi", steps: ["Toggle banner notifikasi in-app mana yang aktif: stok menipis, expense pending approval, selisih kas shift, reminder booking."] },
      {
        title: "Printer",
        steps: [
          "Saat klik \"Cetak Struk\", browser otomatis membuka dialog print yang sudah menampilkan semua printer yang terhubung ke komputer itu — tinggal pilih di sana, tidak perlu diatur apa pun supaya bisa mencetak.",
          "Isi Nama Printer & Lebar Kertas (58mm/80mm) di sini kalau mau NEXBILL MENGINGAT preferensi printer komputer ini secara otomatis (supaya tampilan struk pas dengan kertasnya) — pengaturan ini tersimpan khusus di komputer/browser itu saja, tidak memengaruhi komputer lain di outlet yang sama.",
          "Klik \"Simpan untuk Komputer Ini\" untuk menyimpan, atau \"Hapus\" untuk menghapus preferensi lokal itu.",
        ],
        notes: [
          "Tidak ada web app (termasuk NEXBILL) yang bisa membaca daftar printer terinstall di komputer secara otomatis — itu memang diblokir browser demi privasi. Dialog print browser sendiri yang otomatis mendeteksi printer di komputer itu.",
        ],
      },
      {
        title: "Feature Management",
        navHint: "Hanya terlihat/bisa diubah oleh akun Superuser.",
        steps: [
          "Nyalakan/matikan modul (mis. Home Rental, PPOB) kapan saja tanpa menghapus data — histori transaksi lama tetap tersimpan dan bisa diakses lagi begitu modul dinyalakan kembali.",
          "Sub-fitur di bawah modul utama bisa dimatikan satu-satu tanpa mematikan seluruh modulnya.",
          "PPOB tampil sebagai kartu modul terpisah dari Home Rental — statusnya menyala (aktif) secara default untuk outlet yang sudah lebih dulu pakai PPOB sebelum fitur toggle ini ada, supaya tidak ada yang tiba-tiba kehilangan akses tanpa disengaja.",
        ],
      },
      { title: "Audit Log", steps: ["Feed read-only semua aktivitas staf tercatat di outlet ini, filter berdasarkan jenis entitas."] },
    ],
    notes: [
      "Kebanyakan tab butuh izin manage_settings untuk MENGUBAH (Owner, Superuser, Manager) — melihatnya tetap terbuka untuk staf lain, hanya form-nya jadi read-only/disabled.",
      "\"Hapus Semua Data (Reset Total)\" sudah dipindahkan ke halaman Admin Data.",
    ],
  },
  {
    id: "admin",
    group: "Manajemen & Sistem",
    label: "Admin Data",
    navHint: "Panel tabel (CRUD) hanya untuk akun Superuser. Bagian \"Hapus Semua Data\" di bawahnya juga bisa diakses akun Owner.",
    summary:
      "Panel CRUD mentah langsung ke ~17 tabel master/referensi database — semacam \"jalan pintas ke database\" untuk perbaikan data darurat, sengaja tidak mengekspos tabel transaksi/histori supaya integritas akuntansi tidak rusak. Juga berisi fitur Reset Data (danger zone).",
    steps: [
      "Pilih tab tabel (Produk, Customer, Supplier, Staff, Promo, Membership Tier, Rate Poin Main, Unit PS, Outlet, Device, Gudang, Resep, Aturan Harga, Voucher, Akun Kas/Bank, Chart of Accounts, Pengaturan AI Agent).",
      "Klik Tambah/Edit pada baris, isi field (form otomatis menyesuaikan tipe data kolom), Simpan.",
      "Hapus: untuk tabel yang punya kolom nonaktif (produk, staf, unit rental, promo, aturan harga, voucher, akun) hanya menonaktifkan (soft-delete); tabel lain benar-benar terhapus dan akan gagal kalau masih dipakai data lain.",
      "Di bagian paling bawah ada \"Hapus Semua Data (Reset Total) — Outlet Ini Saja\": ketik ulang persis frasa konfirmasi yang diminta, masukkan ulang password kamu, lalu klik Hapus Semua Data Outlet Ini Sekarang.",
      "Reset menghapus PERMANEN, hanya untuk outlet yang sedang aktif: semua transaksi, order, pembayaran, booking, sesi rental, jurnal & laporan akuntansi, produk & resep, stok & supplier, customer & membership, promo/voucher, expense, aset, data Home Rental, notifikasi, audit log, COA, metode pembayaran, satuan, dan pengaturan lain.",
      "Yang TETAP ADA setelah reset: data cabang/outlet itu sendiri, dan akun staf ber-role Superuser/Owner (termasuk akun lain ber-role sama). Semua staf non-Superuser/Owner di outlet ini ikut terhapus.",
    ],
    notes: [
      "Tabel transaksional (order, pembayaran, jurnal, mutasi stok, audit log) SENGAJA tidak ada di panel CRUD — supaya tidak ada yang bisa merusak riwayat/audit trail lewat jalan pintas ini.",
      "Semua data yang tampil/tersimpan/dihapus (termasuk Reset Data) otomatis dibatasi ke outlet akun kamu sendiri — tidak mungkin melihat, mengedit, atau menghapus data outlet/merchant lain dari sini.",
      "Reset Data tidak bisa dibatalkan dari dalam aplikasi — pemulihan hanya mengandalkan backup otomatis Supabase (di luar aplikasi ini), bukan file lokal.",
    ],
  },
  {
    id: "semua-outlet",
    group: "Manajemen & Sistem",
    label: "Semua Outlet",
    navHint: "Menu ini hanya muncul untuk akun yang terhubung ke lebih dari satu outlet/cabang. Tambah/Edit/Nonaktifkan outlet khusus Owner/Superuser.",
    summary: "Ringkasan gabungan performa semua outlet yang terhubung ke akunmu, sekaligus pusat kelola cabang: tambah outlet baru, edit profil, nonaktifkan/aktifkan, dan pindah cepat ke dashboard outlet mana pun.",
    steps: [
      "Kartu atas menampilkan Total Omzet Hari Ini gabungan semua outlet AKTIF.",
      "Klik \"Tambah Outlet\" (Owner/Superuser) untuk mendaftarkan cabang baru — nama, alamat, telepon. Cabang baru otomatis mendapat Chart of Accounts sendiri dan langsung bisa dipakai.",
      "Satu kartu per outlet aktif: nama (+ tanda \"Outlet utama\" kalau ada), status langganan, omzet hari ini, ketersediaan unit PS, catatan kalau outlet ini tergabung billing group bersama.",
      "Klik \"Buka Dashboard Outlet Ini\" untuk langsung berpindah — setelah itu SEMUA halaman lain (Expense, Staf, Laporan, dll) otomatis mengikuti outlet yang baru dipilih.",
      "Ikon pensil (Owner/Superuser) untuk edit nama/alamat/telepon outlet. Ikon arsip untuk menonaktifkan.",
      "Outlet yang dinonaktifkan pindah ke bagian \"Outlet Dinonaktifkan (Arsip)\" di bawah — bisa diaktifkan lagi kapan saja lewat tombol \"Aktifkan Kembali\".",
    ],
    notes: [
      "Melihat & berpindah outlet terbuka untuk siapa saja dengan akun multi-outlet. Tambah/Edit/Nonaktifkan/Aktifkan hanya untuk role Owner atau Superuser.",
      "Nonaktifkan itu ARSIP, bukan hapus permanen — semua data historis outlet (transaksi, laporan, staf) tetap aman dan lengkap, hanya disembunyikan dari daftar aktif & tidak bisa dipakai transaksi baru.",
      "Outlet utama (home) akun kamu sendiri tidak bisa dinonaktifkan dari sini — nonaktifkan cabang lain, bukan outlet utama, supaya akun kamu tidak terkunci.",
    ],
  },
];
