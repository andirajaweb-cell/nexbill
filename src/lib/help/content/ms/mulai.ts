import type { HelpCategory } from "../../types";

export const MULAI: HelpCategory[] = [
  {
    id: "mulai-disini",
    group: "mulai",
    label: "Selamat Datang — Mula dari Sini",
    summary:
      "NEXBILL ialah aplikasi untuk menjalankan perniagaan sewa PlayStation: mengira masa main, menerima bayaran, menjual makanan/minuman, merekod stok, sehingga menghasilkan laporan kewangan secara automatik. Topik ini menerangkan cara menggunakan Pusat Bantuan dan cara berpindah menu, supaya anda tidak keliru pada hari pertama.",
    subsections: [
      {
        title: "Cara menggunakan Pusat Bantuan ini",
        steps: [
          "Senarai topik berada di sebelah kiri, dikumpulkan daripada yang paling asas (Mula di Sini) hingga yang paling lanjut (Pengurusan & Sistem).",
          "Taip perkataan dalam kotak carian (cth. \"syif\", \"resit\", \"stok\", \"TV\") — senarai topik terus menapis topik yang mengandungi perkataan itu, termasuk di dalam langkah-langkahnya.",
          "Setiap topik mengandungi: Ringkasan (apa kegunaannya), Cara Guna (langkah bernombor), dan Perkara Penting (kesilapan yang kerap berlaku). Ikut langkah mengikut urutan.",
          "Baru pertama kali? Baca mengikut urutan: Konsep Asas → Persediaan Outlet Baharu → Aliran Kerja Sewa PlayStation → Panduan Peranan mengikut tugas anda.",
          "Menghadapi masalah? Buka kumpulan \"Bantuan & Istilah\" di bahagian paling bawah: ada Masalah Lazim & Penyelesaian serta Glosari Istilah.",
        ],
      },
      {
        title: "Log masuk dan log keluar",
        steps: [
          "Buka dashboard.nexbill.id, masukkan e-mel dan kata laluan akaun anda, kemudian tekan Log Masuk. Akaun yang dibuat melalui Google boleh terus masuk dengan butang Google.",
          "Lupa kata laluan? Tekan \"Lupa kata laluan\" di halaman log masuk, ikut pautan yang dihantar ke e-mel.",
          "Untuk keselamatan, satu akaun hanya boleh aktif di satu peranti/pelayar pada satu masa. Jika anda log masuk di telefon lalu cuba log masuk di PC, PC akan ditolak sehingga anda log keluar dari telefon, akaun tidak digunakan selama 30 minit, atau Owner menekan \"Keluarkan\" di Staf & Kebenaran.",
          "Selesai bekerja, tekan Log Keluar di menu akaun (kanan atas) — terutamanya di komputer yang dikongsi.",
        ],
      },
      {
        title: "Mengenali paparan dashboard",
        steps: [
          "Bar sisi kiri mengandungi semua menu, disusun mengikut aliran kerja: Operasi (Sewa PS, Juruwang, Tempahan) di atas, kemudian Jualan & Pelanggan, Inventori & Kewangan, dan Tetapan di bawah. Di telefon, buka bar sisi melalui butang menu (☰).",
          "Bahagian atas (top bar) mengandungi: nama outlet aktif, ikon loceng Notifikasi, pilihan bahasa, dan menu akaun anda.",
          "Tukar bahasa melalui pilihan bahasa di top bar — tersedia Indonesia, English, Melayu, ไทย, Filipino, dan Tiếng Việt. Pusat Bantuan ini turut bertukar bahasa.",
          "Menu yang tidak digunakan outlet anda (cth. Sewa Rumah, Bayaran Bil/PPOB, TV Screensaver) boleh dimatikan oleh Superuser di Tetapan → Feature Management supaya bar sisi lebih ringkas.",
        ],
      },
    ],
    notes: [
      "Semua data disimpan dalam talian (cloud). Anda boleh membuka NEXBILL dari PC, komputer riba, tablet, atau telefon — cukup melalui pelayar (disyorkan Google Chrome atau Microsoft Edge versi terkini).",
      "Perlukan bantuan manusia? Buka menu Perkhidmatan Pelanggan untuk menghantar soalan terus kepada pasukan NEXBILL.",
    ],
  },
  {
    id: "konsep-dasar",
    group: "mulai",
    label: "Konsep Asas NEXBILL",
    summary:
      "Lima perkara yang perlu difahami sebelum menggunakan NEXBILL: outlet, akaun & peranan staf, syif juruwang, transaksi yang direkod automatik, dan perakaunan automatik. Apabila lima perkara ini jelas, menu-menu lain akan mudah difahami.",
    subsections: [
      {
        title: "1. Outlet (cawangan)",
        steps: [
          "Outlet ialah satu premis perniagaan. Semua data (unit PS, produk, transaksi, laporan) sentiasa milik satu outlet tertentu.",
          "Ada lebih daripada satu cawangan? Satu akaun boleh dihubungkan ke beberapa outlet. Menu \"Semua Outlet\" akan muncul untuk melihat ringkasan semua cawangan dan bertukar cawangan dengan satu klik.",
          "Data antara outlet tidak pernah bercampur — outlet lain (termasuk milik orang lain) tidak boleh melihat data anda.",
        ],
      },
      {
        title: "2. Akaun staf dan peranan (role)",
        steps: [
          "Setiap orang yang bekerja sebaiknya mempunyai akaun sendiri — jangan berkongsi satu akaun, supaya jelas siapa melakukan apa.",
          "Peranan menentukan apa yang boleh dilakukan: Superuser (akaun tertinggi, boleh mengatur semuanya termasuk kebenaran), Owner (pemilik), Manager, Accountant (akauntan), Supervisor, Cashier (juruwang), dan Kitchen (dapur).",
          "Kebanyakan menu boleh DILIHAT oleh semua staf, tetapi butang untuk mengubah data (tambah, edit, padam, luluskan) hanya muncul untuk peranan yang berhak. Jadi jika juruwang boleh membuka halaman Perakaunan tetapi tidak boleh mengubah apa-apa, itu memang disengajakan.",
        ],
      },
      {
        title: "3. Syif juruwang",
        steps: [
          "Syif ialah tempoh kerja seorang juruwang memegang laci wang. Buka syif sebelum mula berjualan (isi wang modal yang ada di laci), tutup syif apabila selesai (kira wang di laci).",
          "Semua wang tunai yang masuk dan keluar sepanjang syif dijumlahkan oleh sistem, kemudian dibandingkan dengan kiraan anda — perbezaannya terus kelihatan selepas syif ditutup.",
        ],
      },
      {
        title: "4. Transaksi direkod secara automatik",
        steps: [
          "Setiap sesi sewa, jualan juruwang, sewa bawa pulang, PPOB, perbelanjaan, dan pembelian stok direkod secara automatik — anda tidak perlu menyalin semula ke buku atau Excel.",
          "Semua transaksi boleh dicari semula di menu Transaksi, lengkap dengan resitnya.",
        ],
      },
      {
        title: "5. Perakaunan automatik",
        steps: [
          "Di sebalik setiap transaksi, NEXBILL membuat catatan perakaunan (jurnal) secara automatik. Hasilnya Penyata Untung Rugi, Kunci Kira-kira, dan Aliran Tunai yang sentiasa terkini.",
          "Senarai akaun (Carta Akaun) sudah disediakan sejak outlet dibuat. Pemilik outlet biasa tidak perlu memahami perakaunan untuk menggunakan NEXBILL — cukup jalankan transaksi dengan betul.",
        ],
      },
    ],
    notes: [
      "Beberapa butang yang paling berisiko (padam kekal, ubah matriks kebenaran) hanya muncul untuk akaun Superuser — malah Owner pun tidak melihatnya. Jika butang \"Padam\" tidak muncul, itu bukan ralat.",
      "Hampir semua kesilapan input boleh dibatalkan (void/refund/batal) tanpa memadam data — sejarahnya tetap disimpan supaya laporan kekal jujur.",
    ],
  },
  {
    id: "setup-outlet-baru",
    group: "mulai",
    label: "Persediaan Outlet Baharu (Senarai Semak Lengkap)",
    summary:
      "Urutan langkah yang disyorkan sebelum outlet mula melayan pelanggan — daripada mengisi profil perniagaan sehingga transaksi percubaan pertama. Langkah bertanda (pilihan) boleh dilangkau dan dibuat kemudian.",
    subsections: [
      {
        title: "Langkah 1 — Profil perniagaan, cukai & negara",
        navHint: "Tetapan → Perniagaan & Cukai",
        steps: [
          "Isi nama perniagaan, logo, nombor telefon, alamat lengkap, dan Negara. Negara menentukan mata wang yang dipaparkan dan bahasa balasan pasukan Perkhidmatan Pelanggan NEXBILL.",
          "Isi nama & kata laluan WiFi jika ingin dipaparkan kepada pelanggan (di resit, halaman tempahan dalam talian, atau skrin TV Screensaver). Di TV hanya nama WiFi dipaparkan, tidak pernah kata laluannya.",
          "Tetapkan Cukai (%), Caj Perkhidmatan (%), dan pembundaran bil (cth. dibundarkan ke Rp500/Rp1.000 supaya tiada baki syiling).",
          "Isi Sasaran Jualan bulanan (BEP). Dashboard Ringkasan akan memaparkan sasaran harian dan kemajuannya.",
          "Tetapkan had perbelanjaan yang diluluskan automatik (lalai Rp500.000). Perbelanjaan melebihi had ini menunggu kelulusan Owner/Manager.",
          "Tulis teks Kaki Resit (cth. \"Terima kasih, jumpa lagi!\").",
        ],
      },
      {
        title: "Langkah 2 — Tambah unit PlayStation & kadar",
        navHint: "Sewa PS → butang \"Urus Unit\"",
        steps: [
          "Tambah setiap unit satu demi satu: nama unit (cth. \"PS5 - Bilik 1\"), jenis konsol (PS2 hingga PS5 Slim), jenis TV, dan kadar sewa sejam.",
          "Jenis TV penting untuk kawalan automatik: Android TV boleh dihidupkan/dimatikan melalui aplikasi NexbillAgent, manakala TV biasa (analog/smart TV bukan Android) memerlukan smart plug.",
          "Jika menjual pakej harga tetap (cth. \"Pakej 3 Jam PS4 Rp45.000\"), buat di menu Promosi & Pakej. Pilihan tempoh pantas (30/60/90 minit, dll.) diatur di Tetapan → Tempoh Sewa.",
          "Semak: semua unit muncul di halaman Sewa PS dan tiada yang berstatus Penyelenggaraan.",
        ],
      },
      {
        title: "Langkah 3 — Tetapkan kaedah pembayaran",
        navHint: "Menu \"Pembayaran\"",
        steps: [
          "Tunai (Cash) sudah tersedia secara automatik.",
          "Tambah kaedah bukan tunai yang benar-benar digunakan: QRIS, pindahan bank, GoPay, DANA, kad debit, dll.",
          "Untuk QRIS/pindahan, muat naik gambar QRIS statik outlet dan isi akaun bank outlet — kedua-duanya dipaparkan kepada pelanggan apabila juruwang memilih kaedah itu. Wang sentiasa masuk terus ke akaun outlet, tidak melalui NEXBILL.",
        ],
      },
      {
        title: "Langkah 4 — Tambah staf & tetapkan peranan",
        navHint: "Staf & Kebenaran",
        steps: [
          "Buat akaun untuk setiap staf: nama, e-mel, kata laluan, dan peranan (Manager/Accountant/Supervisor/Cashier/Kitchen).",
          "Pastikan setiap staf sudah mencuba log masuk sebelum hari pertama dibuka.",
        ],
      },
      {
        title: "Langkah 5 (pilihan) — Sambungkan TV & peranti",
        navHint: "Kawalan Peranti",
        steps: [
          "Android TV: ikut \"Panduan Persediaan Peranti\" di halaman Kawalan Peranti (minta token, muat turun NexbillAgent ke PC juruwang, sambungkan TV).",
          "TV biasa (bukan Android): pasang smart plug lalu daftarkan di halaman yang sama. Halaman ini akan mengingatkan unit mana yang masih memerlukan smart plug.",
          "Hubungkan setiap peranti ke unit sewa yang sesuai. Langkah ini boleh dilangkau — TV masih boleh dihidupkan secara manual dengan alat kawalan jauh.",
        ],
      },
      {
        title: "Langkah 6 — Sediakan pencetak resit",
        navHint: "Tetapan → Perniagaan & Cukai → Pencetak",
        steps: [
          "Sambungkan pencetak resit ke komputer juruwang dan pastikan ia dipasang di Windows.",
          "Cuba cetak resit daripada transaksi percubaan (Langkah 10). Jika lebar resit tidak sesuai, isi lebar kertas (58mm/80mm) lalu tekan \"Simpan untuk Komputer Ini\" — ulangi di setiap komputer juruwang.",
        ],
      },
      {
        title: "Langkah 7 (pilihan) — Produk makanan/minuman & stok",
        navHint: "Inventori",
        steps: [
          "Tambah produk satu demi satu, atau muat turun templat Excel lalu muat naik sekali gus.",
          "Isi Harga Kos setiap produk — tanpanya laporan menganggap jualan untung 100%.",
          "Untuk menu yang dimasak (cth. mi goreng, teh ais), buat Resepi supaya stok bahan berkurang automatik setiap kali menu terjual.",
          "Tambah Pembekal jika ingin merekod belian stok.",
        ],
      },
      {
        title: "Langkah 8 (pilihan) — Hidupkan modul tambahan",
        navHint: "Tetapan → Feature Management (khas Superuser)",
        steps: [
          "Sewa Rumah (Home Rental): jika outlet juga menyewakan PS/TV untuk dibawa pulang.",
          "PPOB: jika outlet juga menjual kredit telefon, token elektrik, tambah nilai e-wallet.",
          "TV Screensaver: jika ingin skrin TV Android di bilik memaparkan promosi ketika tidak digunakan.",
          "Biarkan modul yang tidak digunakan dimatikan supaya menu staf tidak mengelirukan.",
        ],
      },
      {
        title: "Langkah 9 — Baki awal (khas outlet yang sudah beroperasi)",
        navHint: "Perakaunan → Migrasi Data",
        steps: [
          "Outlet yang benar-benar baharu boleh melangkau langkah ini.",
          "Jika outlet sudah beroperasi sebelum menggunakan NEXBILL, isi Baki Awal (tunai, akaun bank, belum terima, belum bayar, modal) pada tarikh mula menggunakan NEXBILL, supaya Kunci Kira-kira betul sejak hari pertama.",
          "Aset yang sudah dimiliki (unit PS, TV, kerusi) boleh dimasukkan sekali gus melalui Aset Tetap → Muat Naik Excel dengan pilihan \"Baki awal\".",
        ],
      },
      {
        title: "Langkah 10 — Buka syif & transaksi percubaan",
        navHint: "Syif & Juruwang, kemudian Sewa PS",
        steps: [
          "Buka syif pertama dengan wang modal yang benar-benar ada di laci.",
          "Lakukan satu transaksi percubaan lengkap: mulakan sesi di satu unit, tambah 1 minuman, tamatkan sesi, bayar (cuba tunai dan satu kaedah bukan tunai), kemudian cetak resit.",
          "Semak transaksinya muncul di menu Transaksi dan (jika ada makanan) di Paparan Dapur.",
          "Batalkan (void) transaksi percubaan itu supaya tidak masuk laporan jualan sebenar.",
        ],
      },
    ],
    notes: [
      "Urutan ini cadangan, bukan kewajipan. Yang penting Langkah 1–4, 6, dan 10 selesai sebelum melayan pelanggan.",
      "Teruskan dengan topik \"Aliran Kerja Sewa PlayStation\" untuk melihat bagaimana semua bahagian saling berkait.",
    ],
  },
  {
    id: "alur-kerja-rental",
    group: "mulai",
    label: "Aliran Kerja Sewa PlayStation (dari Mula hingga Laporan)",
    summary:
      "Gambaran satu sesi sewa daripada pelanggan tiba sehingga wangnya masuk laporan kewangan — supaya anda faham Tempahan, Sewa PS, Dapur, Syif, Transaksi, dan Perakaunan saling berkait, bukan menu yang berdiri sendiri.",
    subsections: [
      {
        title: "1. Sebelum pelanggan tiba (pilihan — tempahan)",
        steps: [
          "Pelanggan menempah melalui telefon/WhatsApp → juruwang merekod di menu Tempahan. Atau pelanggan menempah sendiri melalui halaman tempahan dalam talian outlet (pautannya di Tetapan → Perniagaan & Cukai).",
          "Jika jadual bertembung, tempahan masuk Senarai Menunggu, bukan ditolak.",
          "Apabila pelanggan tiba, juruwang menaip kod tempahan untuk daftar masuk pantas.",
        ],
      },
      {
        title: "2. Pelanggan tiba — mulakan sesi",
        steps: [
          "Buka Sewa PS, pilih unit yang kosong, pilih Pakej (harga tetap) atau Sejam, isi nama pelanggan (atau pilih ahli).",
          "Jika dasar outlet meminta wang pendahuluan (DP), tandakan DP dan terima wangnya.",
          "Tekan Mula Sesi. Jika unit disambungkan ke TV/smart plug, TV boleh hidup sendiri.",
        ],
      },
      {
        title: "3. Semasa bermain",
        steps: [
          "Pesanan makanan/minuman → tekan +F&B di kad sesi. Pesanan terus muncul di Paparan Dapur.",
          "Pinjam alat kawalan tambahan → +Aksesori (dikira sejam sejak ditambah).",
          "Tambah masa → Add Time. Tukar bilik → Pindah Unit (bil dan masa turut berpindah).",
          "Pantau semua unit sekali gus melalui Papan Bil Langsung di skrin kedua.",
        ],
      },
      {
        title: "4. Selesai — pembayaran",
        steps: [
          "Tekan \"End Session & Bayar\". Bil akhir (sewa + aksesori + makanan) muncul secara automatik.",
          "Beri diskaun/baucar jika ada, pilih kaedah pembayaran, tekan Bayar. Boleh dibayar sebahagian tunai sebahagian QRIS, atau disimpan sebagai \"bayar kemudian\".",
          "Cetak resit.",
        ],
      },
      {
        title: "5. Selepas bayar — semuanya direkod sendiri",
        steps: [
          "Catatan perakaunan (jurnal) terbentuk automatik dan boleh dilihat di Transaksi → Butiran.",
          "Bayaran tunai automatik masuk kiraan tunai syif yang sedang berjalan.",
          "Pelanggan ahli automatik mendapat mata, dan tahapnya boleh naik.",
          "Angka jualan terus muncul di Dashboard Ringkasan, Laporan, dan Penyata Untung Rugi.",
        ],
      },
      {
        title: "6. Akhir hari — tutup syif",
        steps: [
          "Juruwang mengira wang di laci mengikut pecahan dan memadankan baki aplikasi bukan tunai, kemudian menutup syif.",
          "Perbezaan (jika ada) dipaparkan selepas syif ditutup dan disimpan dalam Sejarah Syif.",
        ],
      },
    ],
    notes: [
      "Untuk sewa yang DIBAWA PULANG pelanggan, alirannya berbeza — lihat topik Sewa Rumah (Home Rental).",
      "Tiada apa yang perlu dimasukkan dua kali: satu transaksi di Sewa PS automatik mengalir ke Dapur, Syif, Transaksi, Laporan, dan Perakaunan.",
    ],
  },
];
