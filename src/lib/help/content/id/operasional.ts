import type { HelpCategory } from "../../types";

export const OPERASIONAL: HelpCategory[] = [
  {
    id: "sop-harian",
    group: "operasional",
    label: "SOP Harian (Checklist Buka–Tutup Toko)",
    summary:
      "Checklist kerja harian yang sama untuk semua staf, kapan pun jadwalnya — dari buka toko sampai serah terima. Cetak dan tempel di meja kasir bila perlu.",
    subsections: [
      {
        title: "Checklist buka toko",
        steps: [
          "Cek semua unit PS menyala normal, stik lengkap dan berfungsi, TV jernih. Stik yang bermasalah: periksa dengan Dokter Stik (Maintenance → Gamepad Tester).",
          "Kalau memakai kontrol TV otomatis, pastikan status perangkat di halaman Kontrol Perangkat \"online\" dan PC kasir yang menjalankan NexbillAgent menyala.",
          "Cek printer struk menyala dan kertasnya cukup.",
          "Buka Booking — lihat pesanan hari ini.",
          "Buka Notifikasi (ikon lonceng) — stok menipis, pengeluaran yang menunggu persetujuan, pengumuman dari NEXBILL.",
          "Buka Shift baru dengan Modal Awal sesuai uang yang benar-benar ada di laci.",
        ],
      },
      {
        title: "Selama jam buka",
        steps: [
          "Pelanggan tanpa booking → mulai sesi dari Rental PS. Dengan booking → check-in pakai kode booking.",
          "Makanan/minuman untuk pelanggan yang sedang main → +F&B di kartu sesinya. Pembeli yang tidak main → lewat Kasir (POS).",
          "Pantau Live Billing Board untuk sesi yang hampir habis, tawarkan perpanjangan sebelum waktunya berhenti.",
          "Pengeluaran kecil → catat langsung di Expense → Cash Out Cepat.",
          "Unit/stik rusak → keluarkan dari penyewaan (Set Maintenance) dan buat tiket di menu Maintenance.",
          "Butuh membatalkan transaksi tapi tidak punya izin → ajukan lewat Staf & Hak Akses → Approval, jangan diakali.",
        ],
      },
      {
        title: "Checklist tutup toko / tutup shift",
        steps: [
          "Akhiri semua sesi yang pelanggannya sudah pulang dan selesaikan pembayarannya.",
          "Hitung uang di laci per pecahan di form Tutup Shift — jangan mengintip angka sistem dulu.",
          "Isi saldo setiap aplikasi non-tunai (QRIS/e-wallet) yang tertera saat itu.",
          "Tutup shift; tulis penyebab selisih (kalau ada) di catatan.",
          "Matikan TV dan unit yang tidak dipakai, rapikan stik dan aksesoris, kunci laci.",
        ],
      },
      {
        title: "Serah terima ke shift berikutnya / manager",
        steps: [
          "Sampaikan: tagihan \"bayar nanti\" yang belum lunas (cek di Transaksi), stok yang menipis, unit/perangkat bermasalah (pastikan sudah ada tiket Maintenance), dan selisih kas (kalau ada).",
          "Informasikan permintaan persetujuan yang masih menunggu kepada orang yang berwenang.",
        ],
      },
    ],
    notes: ["Detail setiap fitur yang disebut di sini ada di topiknya masing-masing (Rental PS, Kasir, Shift & Kasir, dll)."],
  },
  {
    id: "ringkasan",
    group: "operasional",
    label: "Dashboard Ringkasan (Halaman Utama)",
    navHint: "Menu paling atas di sidebar — halaman yang terbuka setelah login.",
    summary:
      "Layar pantauan utama: pendapatan dan laba hari ini, jumlah transaksi, status unit PS, posisi kas, grafik jam ramai vs sepi, unit paling produktif, produk terlaris, dan stok menipis — semua dalam satu halaman.",
    subsections: [
      {
        title: "Membaca kartu-kartu angka",
        steps: [
          "Target BEP Hari Ini: target bulanan dari Pengaturan dibagi rata per hari — tampil persentase tercapai atau kekurangannya.",
          "Pendapatan & Laba: total pendapatan hari ini (rinci rental, makanan/minuman, produk lain), pengeluaran hari ini, laba kotor, dan perkiraan laba bersih.",
          "Transaksi & Pelanggan: jumlah transaksi sah (sama dengan halaman Transaksi), jumlah pelanggan hari ini, member baru, dan booking hari ini.",
          "Status Unit PS: berapa unit sedang dipakai, tersedia, dibooking, dalam perbaikan, dan tingkat pemakaian (utilisasi) dalam persen.",
          "Kas & Keuangan: kas masuk dan keluar hari ini, saldo kas, saldo rekening, piutang (tagihan pelanggan belum lunas), dan hutang ke supplier.",
        ],
      },
      {
        title: "Grafik Jam Ramai vs Jam Sepi",
        steps: [
          "Menampilkan rata-rata transaksi per hari untuk setiap jam, dari transaksi 30 hari terakhir.",
          "Batang hijau = jam paling ramai, batang kuning = jam paling sepi di antara jam operasional. Batang abu-abu = jam di luar jam operasional (hanya sesekali ada transaksi) dan tidak ikut dinilai.",
          "Arahkan kursor/ketuk batang untuk melihat rata-rata per hari dan total 30 hari jam itu.",
          "Gunakan untuk mengatur jumlah staf per jam dan membuat promo khusus jam sepi.",
        ],
      },
      {
        title: "Daftar di bagian bawah",
        steps: [
          "Pendapatan per Unit PS (hari ini) dan unit paling produktif.",
          "Produk Terlaris Hari Ini dan Game Paling Banyak Dimainkan (isi nama game saat mulai sesi supaya daftar ini terisi).",
          "Stok Menipis: produk yang stoknya sudah di bawah batas minimum.",
          "Rekonsiliasi Pendapatan: membandingkan pendapatan menurut tanggal transaksi dengan pendapatan di Laba Rugi — kalau ada selisih, cek Accounting → Rekonsiliasi.",
        ],
      },
    ],
    notes: [
      "Angka hari ini dihitung menurut zona waktu outlet (mis. WIB), bukan zona waktu server.",
      "Laba di halaman ini adalah perkiraan harian. Untuk angka resmi per bulan, pakai Accounting → Laba Rugi.",
    ],
  },
  {
    id: "rental-ps",
    group: "operasional",
    label: "Rental PS (Sewa Main di Tempat)",
    summary:
      "Halaman inti untuk memulai, mengatur, dan menyelesaikan sesi sewa PlayStation per unit — termasuk tambah waktu, pindah unit, tambah makanan/aksesoris, kontrol TV, dan pembayaran.",
    subsections: [
      {
        title: "Memulai sesi baru",
        steps: [
          "Di panel \"SESI BARU\", pilih unit yang kosong (unit yang sedang dipakai atau diperbaiki tidak muncul).",
          "Pilih Paket (harga tetap dari menu Promo & Paket) atau Per Jam. Untuk Per Jam, pilih durasi (mis. 60 menit) atau \"Terbuka\" (waktu berjalan terus sampai dihentikan).",
          "Isi pelanggan: Non-Member (ketik nama bebas) atau Member (ketik nama/nomor HP lalu pilih dari hasil pencarian — harga & poin member otomatis berlaku).",
          "Opsional: isi nama game yang dimainkan, dan centang \"Customer Bayar Dimuka (DP)\" kalau pelanggan membayar di awal.",
          "Tekan MULAI SESI. Kalau unit terhubung ke kontrol TV, TV menyala dan beralih ke PlayStation sendiri.",
        ],
      },
      {
        title: "Selama sesi berjalan",
        steps: [
          "Setiap unit tampil sebagai kartu dengan hitung mundur waktu dan rincian biaya berjalan.",
          "Jeda/Lanjut: menghentikan sementara hitungan waktu (mis. listrik padam, pelanggan izin keluar).",
          "Add Time: tambah waktu +10 sampai +120 menit.",
          "Pindah Unit: pindahkan sesi ke unit lain yang kosong — waktu dan tagihan ikut pindah.",
          "+ Aksesoris: sewa stik tambahan/VR/headset, dihitung per jam sejak ditambahkan. Tekan \"Kembalikan\" untuk menghentikan hitungannya.",
          "+ F&B: tambah makanan/minuman ke tagihan sesi ini — pesanan langsung masuk Kitchen Display.",
          "TV On / TV Off: nyalakan/matikan TV unit ini (butuh perangkat yang sudah dihubungkan di Kontrol Perangkat).",
        ],
      },
      {
        title: "Mengakhiri sesi & menerima pembayaran",
        steps: [
          "Tekan \"End Session & Bayar\". Tagihan akhir tampil: sewa + aksesoris + makanan/minuman.",
          "Opsional: isi Diskon, centang Pajak, atau masukkan kode voucher/reward pelanggan.",
          "Isi jumlah bayar (bawaan: sisa tagihan penuh), pilih metode pembayaran, tekan Bayar.",
          "Tunai langsung lunas. QRIS/transfer/e-wallet: pelanggan membayar ke QRIS/rekening outlet yang tampil di layar, lalu tekan \"Tandai Diterima\" setelah uang masuk dan isi nomor referensinya bila ada.",
          "Bisa bayar sebagian dengan satu metode lalu sisanya dengan metode lain (split payment).",
          "Pelanggan akan bayar belakangan? Tekan \"Tutup (bayar nanti di POS)\" — tagihan tersimpan dan bisa dilunasi dari Kasir (POS) atau Transaksi.",
          "Cetak struk dari kartu sesi yang sudah selesai.",
        ],
      },
      {
        title: "Kelola unit PS",
        steps: [
          "Tekan \"Kelola Unit\" untuk menambah/mengubah unit: nama, konsol, jenis TV, tarif per jam.",
          "Set Maintenance: keluarkan unit dari penyewaan sementara (tidak bisa saat unit sedang dipakai).",
          "Nonaktifkan: arsipkan unit yang tidak dipakai lagi — riwayatnya tetap tersimpan.",
          "Unit yang jam pemakaiannya sudah melewati batas servis (diatur di Pengaturan → Notifikasi → Maintenance Prediktif Unit) mendapat tanda \"butuh servis\".",
        ],
      },
    ],
    notes: [
      "Sesi dengan durasi tertentu berhenti sendiri saat waktunya habis — tapi pembayarannya tetap harus diselesaikan kasir.",
      "Alarm berbunyi sekali saat sisa waktu tinggal 5 menit.",
      "Semua staf yang login bisa memulai dan menyelesaikan sesi.",
    ],
  },
  {
    id: "billing-board",
    group: "operasional",
    label: "Live Billing Board (Layar Pantau)",
    summary:
      "Layar khusus untuk memantau semua sesi yang sedang berjalan secara langsung — cocok dipasang di TV/monitor kedua di area kasir. Hanya untuk dilihat, tidak ada tombol aksi.",
    steps: [
      "Buka menu Live Billing Board di layar tambahan dan biarkan terbuka.",
      "Halaman memperbarui diri setiap 3 detik.",
      "Setiap kartu menampilkan: nama unit & konsol, status main/jeda, nama pelanggan & game, waktu berjalan, perpanjangan, dan rincian biaya.",
      "Kotak ringkasan di atas: jumlah sesi aktif, yang main vs dijeda, pesanan makanan yang sedang diproses, dan total tagihan berjalan.",
    ],
    notes: ["Semua aksi (bayar, tambah waktu, dll) tetap dilakukan di halaman Rental PS."],
  },
  {
    id: "booking",
    group: "operasional",
    label: "Booking (Reservasi)",
    summary:
      "Kelola pesanan unit PS di muka — catat booking, terima booking online dari pelanggan, check-in cepat dengan kode, pindah unit, dan tandai pelanggan yang tidak datang.",
    subsections: [
      {
        title: "Mencatat booking baru",
        steps: [
          "Isi nama dan nomor HP pelanggan.",
          "Pilih unit tertentu, atau \"Unit apa saja\" + jenis konsol.",
          "Isi jam mulai dan selesai, opsional uang muka (DP) dan catatan, lalu tekan \"Buat Booking\".",
          "Kalau jadwal bentrok, booking otomatis masuk Waiting List dan posisinya ditampilkan.",
          "Map Booking (tampilan bawaan): satu baris per unit, jam dari 08.00 sampai 08.00 besok, garis merah = sekarang. Warna blok = status. Klik blok untuk detail & aksi; klik bagian kosong untuk langsung mengisi form booking di unit & jam itu.",
        ],
      },
      {
        title: "Booking online oleh pelanggan",
        steps: [
          "Aktifkan \"terima booking online\" dan salin tautan halaman booking outlet di Pengaturan → Business & Tax → Booking / Reservasi.",
          "Bagikan tautannya di WhatsApp, Instagram, atau Google Maps. Pelanggan melihat unit yang kosong, memilih jam, dan mendapat kode booking.",
          "Atur jeda antar-booking, batas waktu check-in (booking yang tidak datang dilepas otomatis), dan batas minimal waktu pesan sebelum jam main.",
          "Banner promosi di halaman booking diatur di Pengaturan → Banner Iklan.",
          "Begitu pelanggan booking online atau lewat WhatsApp, pop-up \"Booking baru masuk!\" muncul di halaman dashboard mana pun (dengan bunyi): Konfirmasi, Lihat di Map Booking, atau chat WA pelanggan.",
        ],
      },
      {
        title: "Saat pelanggan datang & aksi lain",
        steps: [
          "Ketik kode booking (mis. BK-00001) di kotak pencarian atas → tekan Enter/\"Cari & Check-in\".",
          "Konfirmasi: menyetujui booking yang masih menunggu atau di waiting list.",
          "QR: tampilkan kode QR booking untuk pelanggan.",
          "Pindah Unit: pindahkan booking ke unit lain (alasan opsional).",
          "No-show: tandai pelanggan yang tidak datang. Batal: membatalkan booking (alasan wajib).",
        ],
      },
    ],
    notes: [
      "Pengingat otomatis ke pelanggan lewat WhatsApp saat ini tidak aktif — hubungi pelanggan secara manual lewat nomor di booking bila perlu.",
      "Warna label menunjukkan asal booking: Kasir (dicatat staf), Online (halaman booking), atau WhatsApp.",
    ],
    roles: "Mencatat/konfirmasi/check-in/batal: Owner, Superuser, Manager, Supervisor, Cashier. Membatalkan status No-show: Owner/Superuser.",
  },
  {
    id: "pos",
    group: "operasional",
    label: "Kasir (POS) — Jual Makanan, Minuman & Barang",
    summary:
      "Untuk menjual produk (makanan, minuman, barang) kepada pembeli yang tidak sedang menyewa — atau untuk melunasi tagihan yang disimpan \"bayar nanti\". Waktu sewa PS tidak dijual di sini, tapi di Rental PS.",
    subsections: [
      {
        title: "Menjual produk",
        steps: [
          "Klik produk di daftar (dikelompokkan per kategori), atau ketik nama/scan barcode di kotak pencarian. Kalau hanya satu produk yang cocok, tekan Enter dan produk langsung masuk keranjang.",
          "Tanpa alat scanner? Tekan tombol \"Scan kamera\" di sebelah kotak pencarian lalu arahkan kamera HP/laptop ke barcode — produk langsung masuk keranjang, bisa beberapa berturut-turut. Kartu member: scan QR-nya di Rental PS (mode Member) — QR ada di Membership → detail member.",
          "Atur jumlah dengan tombol +/- di keranjang.",
          "Opsional: isi Diskon, masukkan kode voucher (tekan Cek), centang Pajak/Service Charge.",
          "Pilih metode pembayaran lalu tekan Bayar.",
          "Tunai: terima uangnya, tekan \"Konfirmasi Cash Diterima\". QRIS/transfer: tunjukkan QRIS/rekening outlet di layar, tunggu uang masuk, lalu tandai diterima.",
          "Tekan Cetak Struk.",
        ],
      },
      {
        title: "Tagihan terbuka (Open Orders)",
        steps: [
          "Tagihan yang belum dibayar (mis. dari sesi rental yang \"bayar nanti\") tampil di bagian Open Orders.",
          "Split: pecah satu tagihan menjadi beberapa bagian (mis. teman patungan).",
          "Gabung: centang 2 tagihan atau lebih lalu tekan \"Gabung N Order\" supaya dibayar sekaligus.",
        ],
      },
    ],
    notes: [
      "Isi keranjang tersimpan di browser — pindah menu atau refresh tidak menghilangkannya.",
      "Produk kategori \"Sewa Perangkat\" tidak tampil di sini karena itu bagian dari Home Rental.",
      "Diskon manual kasir dibatasi sesuai batas yang diatur owner di Pengaturan → Preferensi.",
    ],
  },
  {
    id: "kitchen",
    group: "operasional",
    label: "Kitchen Display (Layar Dapur)",
    summary:
      "Papan pesanan dapur tanpa kertas: semua pesanan makanan/minuman dari Kasir dan dari sesi rental muncul di sini, dalam 4 kolom sesuai tahapannya.",
    steps: [
      "Pesanan baru masuk kolom Baru dengan bunyi alarm.",
      "Urutan tombol: Konfirmasi → Mulai Masak → Siap Diantar → Sudah Diantar (hilang dari papan).",
      "Pesanan di kolom Baru bisa dibatalkan dengan tombol Batal dan alasannya (mis. \"Bahan habis\").",
      "Tombol 🔊/🔇 menyalakan/mematikan bunyi. \"Aktifkan Notifikasi Browser\" supaya pesanan tetap muncul walau layar sedang di aplikasi lain.",
    ],
    notes: [
      "Papan menyegarkan diri otomatis setiap beberapa detik.",
      "Pesanan yang baru \"Siap\" berbunyi berbeda, supaya pelayan tahu harus mengantar.",
      "Lihat juga topik \"Saya Staf Dapur\" di grup Panduan per Peran.",
    ],
  },
  {
    id: "shift",
    group: "operasional",
    label: "Shift & Kasir (Laci Uang)",
    summary:
      "Buka shift dengan modal awal, catat uang yang disetor atau dipindah, lalu tutup shift dengan menghitung uang per pecahan. Sistem membandingkan hitunganmu dengan catatan transaksi supaya selisih kas langsung ketahuan.",
    subsections: [
      {
        title: "Membuka shift",
        steps: [
          "Hitung dulu uang yang ada di laci sekarang, isi hasilnya sebagai Modal Awal, lalu tekan Buka Shift.",
          "Kalau jumlahnya berbeda dari uang yang ditinggalkan shift sebelumnya, sistem meminta alasan (mis. \"owner mengambil Rp100.000 untuk belanja\") dan menandainya untuk ditinjau.",
          "Secara bawaan hanya boleh ada satu shift terbuka per outlet, supaya selisih jelas milik siapa. Outlet dengan beberapa laci bisa mengizinkan beberapa shift di Pengaturan → Preferensi.",
        ],
      },
      {
        title: "Selama shift",
        steps: [
          "Semua pembayaran tunai (rental, kasir, PPOB, membership, pendapatan lain) otomatis masuk hitungan kas shift yang sedang terbuka.",
          "Catat Setoran Kas: saat uang dari laci diserahkan ke owner, brankas, atau disetor ke bank.",
          "Ajukan Pindah Kas: saat uang dipindahkan antar tempat kas (mis. tambahan modal dari Kas Besar ke laci). Riwayat setoran dan pindah kas tersimpan di halaman ini.",
        ],
      },
      {
        title: "Menutup shift",
        steps: [
          "Isi jumlah lembar/keping untuk setiap pecahan uang — total terhitung otomatis. Jangan melihat angka sistem dulu (hitungan \"buta\").",
          "Isi Verifikasi Saldo Non-Tunai: buka aplikasi/dashboard setiap e-wallet atau saldo deposit yang dipakai, isi saldo yang tertera saat itu.",
          "Isi uang yang ditinggal di laci untuk shift berikutnya; sisanya dianggap diserahkan ke owner/brankas.",
          "Tambahkan catatan bila ada selisih yang sudah diketahui, lalu tekan Tutup Shift.",
          "Ringkasan Tutup Shift menampilkan: Modal Awal, Uang Masuk, Uang Keluar, Ekspektasi Kas (yang seharusnya ada), hasil hitunganmu, dan Selisih. Merah = kurang, kuning = lebih.",
          "Riwayat Shift bisa difilter Per Hari, Per Bulan (bawaan: bulan ini), atau Per Tahun — geser dengan tombol ‹ › — ditambah filter karyawan dan status (masih buka, ada selisih, ditandai anti-fraud). Ringkasan di atas tabel menjumlahkan shift, selisih kas, dan selisih non-tunai sesuai filter.",
        ],
      },
      {
        title: "Menutup shift milik kasir lain",
        steps: [
          "Kalau kasir pulang tanpa menutup shift, atasan bisa menutupnya: hitung uang di laci secara fisik dan tulis alasannya (wajib).",
          "Penutupan ini dicatat atas nama orang yang menutup dan ditandai untuk ditinjau.",
        ],
      },
      {
        title: "Channel saldo deposit (non-tunai)",
        steps: [
          "Daftar saldo yang wajib dicek setiap tutup shift (mis. Saldo Deposit PPOB). Channel bawaan bisa diganti namanya tapi tidak bisa dihapus.",
          "Tambah channel baru dengan mengisi namanya lalu \"Tambah Channel\" — akun pembukuannya dibuat otomatis.",
        ],
        notes: ["Bagian ini hanya terlihat oleh Owner, Superuser, dan Accountant."],
      },
    ],
    notes: [
      "Shift yang selisihnya atau jumlah void/refund-nya melebihi ambang (Pengaturan → Preferensi) otomatis ditandai untuk ditinjau Owner/Manager. Kasir tetap bisa menutup shift.",
      "Saran Modal Awal diambil dari akun kas yang dicentang di Pengaturan → Preferensi → Komposisi Modal Awal Shift. Itu hanya saran — tetap isi sesuai uang fisik.",
    ],
  },
  {
    id: "devices",
    group: "operasional",
    label: "Kontrol Perangkat (TV & Smart Plug)",
    summary:
      "Nyalakan/matikan TV dan konsol dari dashboard, dan biarkan TV menyala/mati sendiri mengikuti sesi. Android TV dikendalikan lewat aplikasi NexbillAgent di PC kasir; TV biasa (analog atau smart TV non-Android) lewat smart plug.",
    subsections: [
      {
        title: "Memilih cara kontrol yang tepat",
        steps: [
          "Android TV / Google TV → pakai NexbillAgent (tanpa alat tambahan). TV bisa dinyalakan, dimatikan, dan dipindah ke HDMI PlayStation secara otomatis.",
          "TV analog/tabung, TV digital biasa, dan smart TV non-Android (Viva OS, Hisense OS, webOS, dll) → butuh smart plug yang memutus/menyambung listriknya.",
          "Kalau outlet punya unit dengan TV non-Android yang belum terhubung smart plug, halaman ini menampilkan peringatan dan tombol \"Lihat Rekomendasi Smart Plug\" menuju produk yang cocok.",
        ],
      },
      {
        title: "Android TV lewat NexbillAgent (5 langkah, sekali per outlet)",
        steps: [
          "Langkah 1 — Minta Token: tekan \"Minta Token Relay Agent\". Balasan berisi token rahasia dikirim tim NEXBILL lewat menu Customer Service.",
          "Langkah 2 — Unduh NexbillAgent dan ekstrak ke PC kasir (Windows). Baca \"Panduan Lengkap NexbillAgent\" — tersedia 6 bahasa, berisi setup PC & TV, cara mengunci IP TV, dan 28 masalah umum beserta solusinya.",
          "Langkah 3 — Jalankan NexbillAgent dan tempel tokennya.",
          "Langkah 4 — Siapkan setiap TV (sekali per TV): sambungkan ke WiFi yang sama, aktifkan opsi yang diminta panduan, kunci IP-nya.",
          "Langkah 5 — Tambahkan TV di halaman ini (isi IP TV) lalu hubungkan ke unit rentalnya.",
        ],
      },
      {
        title: "Smart plug",
        steps: [
          "Smart plug resmi NEXBILL: isi nomor seri yang tertera di label di bagian \"Klaim Smart Plug NEXBILL\" — tidak perlu pengaturan lain.",
          "Tasmota: isi nama dan topik MQTT perangkat.",
          "Tuya / Smart Life: setiap outlet memakai akun Tuya Cloud API sendiri — boleh lebih dari satu akun. Tambahkan akun (Access ID & Secret) di Pengaturan → Business & Tax → Integrasi Tuya Cloud API, lalu tambahkan perangkat dengan Device ID-nya. Kalau ada beberapa akun, biarkan pilihan akun \"Otomatis\": sistem mencari sendiri akun yang memiliki Device ID itu.",
          "Setelah ditambah, hubungkan perangkat ke unit di tabel \"Hubungkan Perangkat ke Unit Rental\".",
        ],
        notes: [
          "Akun Tuya Cloud gratis (Trial) hanya bisa mengontrol sekitar 8 perangkat dan harus diperpanjang sekitar sebulan sekali di iot.tuya.com (Service API → IoT Core → Extend Trial). Punya smart plug lebih dari itu? Buat akun Tuya Cloud kedua (email lain), tautkan sebagian smart plug ke akun itu, lalu tambahkan sebagai akun baru di Pengaturan. Kalau satu akun lupa diperpanjang, semua smart plug di akun itu berhenti merespons — catat tanggal perpanjangan tiap akun di kalender.",
          "Selama masa percobaan langganan, smart plug belum bisa ditambahkan dan kontrol Android TV dibatasi 1 unit.",
        ],
      },
      {
        title: "Memakai sehari-hari",
        steps: [
          "Semua staf bisa menekan Nyalakan/Matikan di kartu perangkat, atau TV On/TV Off di kartu sesi Rental PS.",
          "Status online/offline setiap perangkat terlihat di halaman ini. Perangkat offline tetap bisa dinyalakan manual dengan remote.",
          "Dengan NexbillAgent terbaru, TV otomatis pindah ke PlayStation saat sesi dimulai dan ke tampilan TV Screensaver saat sesi selesai (lihat topik TV Screensaver).",
        ],
      },
    ],
    roles: "Menyalakan/mematikan: semua staf. Menambah/mengubah/menghapus/menghubungkan perangkat: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "qr-pelanggan",
    group: "operasional",
    label: "QR Pelanggan per Bilik & Peringatan Waktu di TV",
    navHint: "Rental PS → Kelola Unit → QR Pelanggan",
    summary:
      "Setiap bilik punya stiker QR. Pelanggan cukup scan dengan HP untuk melihat sisa waktu dan perkiraan tagihan, memesan makanan/minuman, minta tambah waktu, atau memanggil kasir — tanpa harus berdiri ke kasir. Semua permintaan masuk ke panel Permintaan Pelanggan di Rental PS dan baru berlaku setelah kasir menerimanya. TV Android juga bisa menampilkan peringatan sisa waktu dan layar Waktu Habis.",
    subsections: [
      {
        title: "Memasang QR di bilik",
        steps: [
          "Buka Rental PS → Kelola Unit → tekan \"QR Pelanggan\" pada unit. QR dibuat otomatis.",
          "Tekan \"Cetak stiker semua unit\" untuk mencetak QR semua unit sekaligus, gunting, lalu tempel di dekat TV tiap bilik.",
          "Atur izinnya di jendela yang sama: boleh pesan F&B dari HP, boleh minta tambah waktu dari HP. Panggil kasir selalu aktif.",
          "Kalau QR difoto dan disalahgunakan, tekan \"Ganti QR\" — stiker lama langsung tidak berlaku, cetak yang baru.",
        ],
      },
      {
        title: "Yang bisa dilakukan pelanggan dari HP",
        steps: [
          "Melihat sisa waktu bermain (berjalan detik per detik) dan perkiraan tagihan berjalan. Saat sisa waktu ≤5 menit muncul peringatan.",
          "Pesan makanan/minuman: pilih menu, atur jumlah, kirim. Harga diambil dari data produk, bukan dari HP.",
          "Minta tambah waktu: +30/+60/+90/+120 menit, lengkap dengan perkiraan biaya.",
          "Panggil kasir: minta bill, stik bermasalah, butuh bantuan, atau lainnya (bisa tambah catatan). Status setiap permintaan terlihat di HP: menunggu, diterima, atau ditolak beserta alasannya.",
        ],
      },
      {
        title: "Menanggapi permintaan (kasir)",
        steps: [
          "Permintaan baru muncul di panel \"Permintaan Pelanggan (QR Bilik)\" di bagian atas Rental PS, disertai bunyi.",
          "Pesanan F&B: tekan \"Terima & masukkan ke bill\" — item masuk tagihan sesi dan langsung tampil di Kitchen Display.",
          "Tambah waktu: tekan \"Terima & tambah waktu\" — durasi sesi bertambah. Panggil kasir: datangi bilik lalu tekan \"Sudah ditangani\".",
          "Tekan \"Tolak\" bila tidak bisa dilayani (mis. menu habis); alasan yang diisi terlihat di HP pelanggan.",
        ],
      },
      {
        title: "Peringatan sisa waktu & layar Waktu Habis di TV",
        navHint: "Pengaturan → TV Screensaver → Peringatan Waktu & Layar Waktu Habis",
        steps: [
          "Khusus TV Android yang otomatisasinya sudah aktif dan terverifikasi (NexbillAgent v1.2).",
          "Peringatan sisa waktu (mati secara bawaan): beberapa menit sebelum habis, TV pindah sebentar ke layar besar \"SISA WAKTU\" berisi QR bilik, lalu kembali sendiri ke HDMI PlayStation. Atur menit dan lama tampilnya.",
          "Layar \"WAKTU HABIS\": setelah sesi berhenti otomatis dan tagihan belum dibayar, TV menampilkan ajakan menyelesaikan pembayaran di kasir (tanpa nominal), sampai dibayar atau 15 menit.",
          "Peringatan dikirim sekali per sesi dan berlaku lagi setelah waktu ditambah.",
        ],
      },
    ],
    notes: [
      "Permintaan dari HP tidak pernah mengubah tagihan sendiri — kasir yang memutuskan. Pesanan yang sesinya sudah selesai tidak bisa diterima; layani langsung lewat Kasir.",
      "Halaman HP tidak menampilkan nama atau nomor pelanggan, dan memakai bahasa sesuai Negara outlet.",
      "Peringatan TV dan penghentian sesi otomatis bergantung pada penjadwal NEXBILL yang berjalan di server.",
    ],
    roles: "Semua staf yang login bisa menanggapi permintaan dan menampilkan/mencetak QR. Mengubah izin QR dan setelan peringatan TV: Owner, Superuser, Manager.",
  },
  {
    id: "tv-screensaver",
    group: "operasional",
    label: "TV Screensaver (Layar Promosi di Bilik)",
    navHint: "Pengaturan → TV Screensaver (modul harus dinyalakan dulu di Pengaturan → Feature Management).",
    summary:
      "Saat unit tidak dipakai, TV Android di bilik menampilkan nama outlet, harga, QR booking, jam, dan status unit (TERSEDIA / sisa waktu) — lalu bisa dibuka staf dengan PIN. Khusus TV Android; TV analog dan smart TV non-Android tidak didukung.",
    subsections: [
      {
        title: "Mengatur tampilan",
        steps: [
          "Isi Judul besar (mis. \"Mau Main?\"), baris konsol (mis. \"PS5 • PS4 • PS3\"), baris harga (mis. \"Mulai Rp5.000/jam\"), dan baris tambahan (promo, jam buka).",
          "Atur setelah berapa menit tidak dipakai layar muncul.",
          "Pilih yang ditampilkan: jam & tanggal, status unit, QR booking, dan nama WiFi (password WiFi tidak pernah ditampilkan).",
          "Atur PIN Staf supaya layar hanya bisa ditutup staf. Tanpa PIN, siapa pun yang menekan remote bisa menutupnya.",
          "Mode Malam: redupkan layar di jam tertentu (maksimal 90% — layar tidak pernah hitam total supaya tidak dikira mati).",
        ],
      },
      {
        title: "Memasang layar di TV",
        steps: [
          "Di bagian \"Layar Terpasang\", tambah layar: beri nama dan pilih unit rental (TV Android) — muncul kode 6 angka.",
          "Di TV, buka browser dan ketik alamat nexbill.id/tv.",
          "Masukkan kode 6 angka memakai tombol angka di remote. Layar langsung terhubung ke unit itu.",
          "Ulangi untuk setiap TV. Layar tanpa unit bisa dipakai untuk branding saja (mis. TV di ruang tunggu).",
        ],
      },
    ],
    notes: [
      "Isi layar bergeser perlahan supaya panel TV tidak meninggalkan bayangan permanen.",
      "Kalau internet putus sebentar, layar tetap menampilkan tampilan terakhir dan terus mencoba menyambung.",
      "Soal listrik: TV yang menyala terus menambah biaya sekitar Rp25.000–50.000 per TV per bulan. Pakai Mode Malam atau matikan TV di luar jam buka.",
    ],
  },
  {
    id: "home-rental",
    group: "operasional",
    label: "Home Rental (Sewa Dibawa Pulang)",
    navHint: "Muncul di sidebar setelah modul dinyalakan di Pengaturan → Feature Management (khusus Superuser).",
    summary:
      "Modul terpisah untuk menyewakan PS, Playbox, TV, dan aksesoris yang DIBAWA PULANG pelanggan — dari booking, serah terima dengan deposit, sampai pengembalian dengan pemeriksaan kondisi dan penilaian pelanggan.",
    subsections: [
      {
        title: "Menyiapkan (sekali di awal)",
        steps: [
          "Tab Kebijakan: isi deposit, denda keterlambatan, biaya antar-jemput per jarak, aturan kerusakan, daftar checklist pengembalian, dan aturan yang tercetak di struk/perjanjian sewa.",
          "Tab Katalog Produk: atur tarif per 12 jam, harian, per hari tambahan, dan mingguan untuk setiap produk.",
          "Tab Aset: daftarkan setiap barang fisik dengan kodenya (mis. PS5-001). Status aset: Tersedia, Dipesan, Disiapkan, Disewa, Diantar, Dikembalikan, Diperiksa, Rusak, Hilang, Diperbaiki, Pensiun.",
          "Tab Paket: gabungkan beberapa produk dalam satu paket (mis. PS4 + TV 32\").",
        ],
      },
      {
        title: "Membuat booking & serah terima (checkout)",
        steps: [
          "Tab Booking → buat booking: pilih pelanggan, produk/paket, tanggal mulai dan rencana kembali. Isi jarak dari toko kalau diantar (kosongkan untuk biaya antar tetap).",
          "Untuk verifikasi, catat identitas pelanggan (KTP, atau kartu pelajar dan data orang tua/wali untuk penyewa di bawah umur).",
          "Tarif dihitung otomatis: ≤12 jam, harian, 2–3 hari (harian + hari tambahan), 7 hari ke atas memakai tarif mingguan.",
          "Saat pelanggan datang/barang dikirim, lakukan Checkout: aset dialokasikan, pembayaran dan deposit tercatat. Pastikan checklist perlengkapan (kabel HDMI, charger, stik) sudah dicek.",
          "Tab Peta Tanggal: klik tanggal untuk melihat semua booking pada hari itu.",
        ],
      },
      {
        title: "Pengembalian (return)",
        steps: [
          "Centang semua item checklist pengembalian (wajib).",
          "Beri penilaian bintang 1–5 dan catatan tentang kondisi barang/perilaku pelanggan.",
          "Ada kerusakan? Isi biaya kerusakan — dipotong dari deposit lebih dulu. Kalau melebihi deposit, sisanya ditagih dengan metode bayar yang dipilih.",
          "Terlambat? Denda dihitung otomatis sesuai Kebijakan.",
          "Setelah return, aset kembali Tersedia dan status deposit tercatat: dilepas penuh, dipotong sebagian, atau hangus.",
        ],
      },
      {
        title: "Risk & Approval",
        steps: [
          "Lihat riwayat sewa dan skor risiko pelanggan (dari kelengkapan identitas, konfirmasi alamat & nomor WA aktif, keterlambatan, no-show, barang rusak/hilang).",
          "Booking pelanggan berisiko tinggi harus disetujui dulu — tekan Setujui atau Tolak.",
          "Pelanggan bermasalah bisa dimasukkan daftar hitam.",
        ],
      },
    ],
    notes: [
      "Semua pendapatan Home Rental (sewa, antar-jemput, denda, ganti rugi) otomatis masuk pembukuan dan tampil di Laporan → Home Rental.",
      "Deposit dicatat terpisah dari pendapatan sampai barang dikembalikan.",
      "Pengingat otomatis ke pelanggan (jadwal ambil, jatuh tempo) saat ini belum aktif — ingatkan pelanggan secara manual.",
    ],
  },
];
