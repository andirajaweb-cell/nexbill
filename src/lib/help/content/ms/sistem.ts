import type { HelpCategory } from "../../types";

export const SISTEM: HelpCategory[] = [
  {
    id: "staff",
    group: "sistem",
    label: "Staf & Kebenaran",
    summary:
      "Urus akaun dan peranan staf, proses permohonan kelulusan (void/refund), lihat jejak aktiviti, atur keselamatan log masuk, dan (khas Superuser) atur kebenaran bagi setiap peranan.",
    subsections: [
      {
        title: "Senarai staf",
        steps: [
          "Tambah Staf: nama, e-mel, kata laluan, dan peranan (Manager, Accountant, Supervisor, Cashier, Kitchen, atau Owner).",
          "Tukar peranan terus dari menu lungsur dalam jadual. Nyahaktifkan akaun staf yang berhenti — datanya tetap disimpan.",
          "Hanya Owner/Superuser boleh menjadikan staf lain sebagai Owner.",
        ],
      },
      {
        title: "Keselamatan log masuk: satu akaun = satu peranti",
        steps: [
          "Apabila peraturan ini aktif (lalai), akaun yang sedang digunakan di satu pelayar tidak boleh log masuk di pelayar/PC lain sehingga log keluar, tidak aktif 30 minit, atau dilog keluarkan.",
          "Staf terlupa log keluar di komputer lain? Tekan \"Log keluarkan\" pada akaunnya dalam senarai staf.",
          "Peraturan ini boleh dimatikan bagi setiap outlet (tidak disarankan).",
        ],
      },
      {
        title: "Kelulusan",
        steps: [
          "Mohon Void/Pembatalan Pesanan: isi nombor pesanan dan sebab. Jika peranan anda dibenarkan, terus dilaksanakan; jika tidak, masuk giliran.",
          "Senarai Permohonan: pemegang kebenaran meluluskan atau menolak.",
          "Syif yang ditanda (perbezaan besar atau banyak void) juga disemak dari sini.",
        ],
      },
      { title: "Log Audit", steps: ["Rekod kronologi semua aktiviti penting: siapa membuat apa, dan bila. Hanya untuk dilihat."] },
      {
        title: "Peranan & Kebenaran",
        navHint: "Hanya kelihatan untuk akaun Superuser.",
        steps: [
          "Jadual kebenaran: baris = kebenaran, lajur = peranan. Tanda/nyahtanda untuk mengubah akses peranan itu — terus berkuat kuasa.",
          "Tekan \"reset\" untuk mengembalikan tetapan lalai sesuatu peranan.",
        ],
      },
    ],
    notes: [
      "Setiap orang sebaiknya mempunyai akaun sendiri. Akaun yang dikongsi menyebabkan perbezaan tunai dan kesilapan tidak dapat dijejak.",
      "Hanya Superuser boleh memadam akaun staf secara kekal; untuk staf yang berhenti, cukup nyahaktifkan.",
    ],
  },
  {
    id: "settings",
    group: "sistem",
    label: "Tetapan Outlet",
    summary:
      "Semua tetapan outlet dalam satu halaman bertab: profil perniagaan & cukai, keutamaan, cawangan, unit, kategori produk, tempoh sewa, sepanduk iklan, TV Screensaver, notifikasi, modul ciri, log audit, dan akaun saya.",
    subsections: [
      {
        title: "Perniagaan & Cukai",
        steps: [
          "Profil perniagaan: nama, logo, telefon, alamat, Negara (menentukan mata wang dan bahasa balasan Perkhidmatan Pelanggan), nama & kata laluan WiFi.",
          "Cukai & Bil: cukai, caj perkhidmatan, pembundaran bil ke Rp100/Rp500/Rp1.000 (perbezaannya direkod automatik), dan had kelulusan perbelanjaan.",
          "Sasaran Jualan Bulanan (titik pulang modal) — dipaparkan sebagai sasaran harian di Dashboard.",
          "Tempahan / Reservasi: jarak antara tempahan, had masa daftar masuk, notis minimum tempahan, terima tempahan dalam talian, dan pautan halaman tempahan outlet.",
          "Integrasi Tuya Cloud API (untuk palam pintar Tuya), Kaki Resit, Pencetak, dan Akaun Bank untuk pembayaran komisen rujukan.",
        ],
      },
      {
        title: "Keutamaan",
        steps: [
          "Mata wang (mengikut Negara), tempoh perakaunan (permulaan tahun kewangan, bulanan/suku tahunan/tahunan), format nombor dan tarikh.",
          "Komposisi Tunai Awal Syif: akaun tunai mana yang dijumlahkan sebagai cadangan tunai awal.",
          "Ambang Anti-Penipuan Syif: perbezaan tunai dan bilangan void/refund setiap syif yang ditanda automatik; had diskaun manual juruwang (%); benarkan beberapa laci tunai dibuka serentak.",
        ],
      },
      {
        title: "Cawangan, Unit, Kategori Produk, Tempoh Sewa",
        steps: [
          "Cawangan: tambah cawangan baharu dan tekan \"Guna Cawangan Ini\" untuk menukar outlet aktif.",
          "Unit: pcs, gram, kg, liter, dll. — digunakan dalam produk, resepi, dan belian.",
          "Kategori Produk: kumpulan produk di juruwang dan laporan.",
          "Tempoh Sewa: pilihan tempoh pantas semasa memulakan sesi (cth. 30, 60, 90, 120 minit).",
        ],
      },
      {
        title: "Sepanduk Iklan, TV Screensaver, Notifikasi",
        steps: [
          "Sepanduk Iklan: gambar promosi (disarankan sekurang-kurangnya 1600×500 px) untuk halaman tempahan dalam talian — atur susunan, pautan, aktif/tidak aktif.",
          "TV Screensaver: skrin promosi di Android TV bilik — lihat topik TV Screensaver.",
          "Notifikasi: pilih peringatan yang dipaparkan (stok hampir habis, perbelanjaan menunggu kelulusan, perbezaan tunai, tempahan). Penyelenggaraan Unit Prediktif: jam penggunaan sebelum unit ditanda perlu diservis.",
        ],
      },
      {
        title: "Feature Management",
        navHint: "Hanya boleh diubah oleh Superuser.",
        steps: [
          "Hidupkan/matikan modul: Home Rental (dan subcirinya), PPOB, TV Screensaver.",
          "Mematikan modul tidak memadam data — sejarah muncul semula apabila modul dihidupkan kembali.",
          "Subciri berlabel \"Akan datang\" belum tersedia.",
        ],
      },
      {
        title: "Akaun Saya",
        steps: [
          "Tukar e-mel log masuk dan kata laluan anda sendiri (kata laluan sekurang-kurangnya 8 aksara).",
          "Akaun yang dibuat dengan Google boleh menetapkan kata laluan supaya juga boleh log masuk dengan e-mel & kata laluan.",
          "Owner: kad \"Padam Akaun & Data\" memadam akaun serta data outlet — tekan \"Hantar Kod Pengesahan\", masukkan kod daripada e-mel, taip HAPUS. Akaun & outlet terus dinyahaktifkan; data peribadi dipadam selewat-lewatnya 30 hari.",
        ],
      },
    ],
    notes: [
      "Mengubah kebanyakan tetapan memerlukan peranan Owner, Superuser, atau Manager; staf lain hanya boleh melihat.",
      "Tetapan pencetak disimpan bagi setiap komputer — atur di setiap komputer juruwang.",
      "Padam Semua Data (reset penuh) ada di menu Data Admin.",
    ],
  },
  {
    id: "semua-outlet",
    group: "sistem",
    label: "Semua Outlet (Pelbagai Cawangan)",
    navHint: "Menu ini hanya muncul untuk akaun yang dihubungkan dengan lebih daripada satu outlet.",
    summary: "Ringkasan semua cawangan dalam satu skrin dan tempat mengurus cawangan: tambah, edit profil, nyahaktifkan, dan terus ke dashboard mana-mana cawangan.",
    steps: [
      "Kad atas: jumlah pendapatan hari ini daripada semua outlet aktif.",
      "Setiap outlet dipaparkan sebagai kad: status langganan, pendapatan hari ini, ketersediaan unit PS.",
      "Tekan \"Buka Dashboard Outlet Ini\" untuk bertukar — semua menu lain terus mengikut outlet itu.",
      "Owner/Superuser: \"Tambah Outlet\" untuk cawangan baharu (carta akaunnya dibuat automatik), ikon pensel untuk edit profil, ikon arkib untuk menyahaktifkan.",
      "Outlet yang dinyahaktifkan berpindah ke bahagian Arkib dan boleh diaktifkan semula bila-bila masa.",
    ],
    notes: [
      "Nyahaktif = mengarkibkan, bukan memadam. Semua sejarah tetap selamat.",
      "Outlet utama akaun anda tidak boleh dinyahaktifkan dari sini.",
    ],
  },
  {
    id: "billing-subscription",
    group: "sistem",
    label: "Langganan NEXBILL",
    navHint: "Menu \"Langganan\" — ini bil outlet anda KEPADA NEXBILL, bukan pendapatan outlet.",
    summary: "Status langganan aplikasi, pilihan pelan (Starter setiap unit PS atau Pro setiap outlet, bulanan/tahunan), pembayaran bil, belian perkakasan (palam pintar, perkhidmatan pemasangan), dan Tambahan AI.",
    steps: [
      "Lihat statusnya: Percubaan (30 hari), Aktif, Menunggu Bayaran, Tempoh Tangguh, atau Digantung.",
      "Pilih pelan semasa melanggan: Starter (setiap unit PS aktif, minimum 5 unit, ciri operasi) atau Pro (rata setiap outlet, unit tanpa had, semua ciri + AI). Kitaran Tahunan = bayar 10 bulan, aktif 12 bulan.",
      "Bayar bil: pilih QRIS, Akaun Maya bank, atau kaedah lain yang tersedia. Selepas membayar, tekan \"Tanda Sudah Dibayar\" jika diminta.",
      "\"Tukar Pelan\": naik ke Pro atau tambah kuota unit Starter berkuat kuasa selepas beza prorata dibayar; turun pelan, kurangkan kuota, atau tukar kitaran berkuat kuasa pada pembaharuan seterusnya. \"Perbaharui Sekarang\" membuat bil tempoh seterusnya lebih awal.",
      "Beli perkakasan: pilih palam pintar atau perkhidmatan pemasangan, atur kuantiti, checkout — semuanya muncul dalam satu bil.",
      "AI: percuma semasa percubaan dan termasuk dalam Pro; pada Starter diaktifkan sebagai Tambahan AI dengan yuran bulanan.",
    ],
    notes: [
      "Semasa percubaan semua ciri Pro dibuka, tetapi palam pintar belum boleh ditambah dan kawalan Android TV terhad kepada 1 unit.",
      "Pelan Starter mengunci Perakaunan, Perbelanjaan, Pendapatan Lain, Aset, PPOB, Sewa ke Rumah, pengesanan anti-penipuan syif, dan pembukaan cawangan baharu (bertanda PRO di menu) — datanya kekal dan terus dibuka selepas naik taraf. Unit PS aktif dihadkan mengikut kuota.",
      "Bil tertunggak masuk Tempoh Tangguh 7 hari; selepas itu akses digantung kecuali halaman Langganan. Peringatan dipaparkan setiap hari semasa tempoh tangguh.",
      "Outlet dalam satu kumpulan bil (pelbagai cawangan) dibilkan dalam satu invois; outlet Pro ke-2 dan seterusnya mendapat diskaun cawangan.",
      "Pembayaran di sini ialah kos kepada NEXBILL dan tidak pernah direkod sebagai pendapatan outlet anda.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "referral",
    group: "sistem",
    label: "Program Rujukan (Jemput Outlet Lain)",
    summary:
      "Jemput pemilik rental lain menggunakan NEXBILL dengan kod/pautan outlet anda. Mereka mendapat diskaun 20% untuk bayaran pertama; anda mendapat komisen setiap kali mereka membayar langganan, selagi langganan itu aktif.",
    steps: [
      "Salin pautan rujukan outlet anda (\"?ref=KOD\") dan kongsikan. Kod dibuat automatik untuk setiap outlet.",
      "Setiap kali outlet yang anda jemput membayar langganan, komisen (lalai 20%) direkod secara automatik.",
      "Kad ringkasan: jumlah komisen dan baki yang belum dibayar. Di bawahnya: sejarah pembayaran dan senarai outlet yang anda jemput.",
      "Isi akaun bank anda di Tetapan → Perniagaan & Cukai. Komisen dibayar secara manual oleh pasukan NEXBILL setiap hari Isnin.",
    ],
    notes: [
      "Komisen hanya daripada bayaran langganan NEXBILL outlet yang dijemput, bukan daripada pendapatan mereka. Berhenti automatik jika mereka berhenti melanggan.",
      "Tahap Affiliate (27%) dan Master Partner (35%) diberikan oleh pasukan NEXBILL kepada rakan kongsi yang aktif menjemput banyak outlet.",
    ],
  },
  {
    id: "rekomendasi-produk",
    group: "sistem",
    label: "Cadangan Produk (Belian Kelengkapan)",
    navHint: "Dipautkan dari halaman Langganan, dan dari amaran palam pintar di Kawalan Peranti.",
    summary:
      "Katalog kelengkapan rental pilihan pasukan NEXBILL (alat kawalan, aksesori, kabel, rangkaian, palam pintar, dll.) dengan pautan terus ke kedai dalam talian. Belian dibuat di kedai tujuan, di luar NEXBILL.",
    steps: [
      "Pilih kategori, klik produk untuk membuka halaman kedainya di tab baharu.",
      "Jika dibuka daripada amaran TV bukan Android di Kawalan Peranti, halaman ini terus menapis produk palam pintar. Tekan \"Lihat semua cadangan produk\" untuk melihat semuanya.",
      "Sentiasa semak harga akhir di halaman kedai — harga katalog hanya rujukan.",
    ],
    notes: ["Belian di sini tidak ditambah secara automatik ke bil Langganan atau simpan kira outlet. Rekodkan sebagai belian aset atau perbelanjaan jika perlu."],
  },
  {
    id: "ai",
    group: "sistem",
    label: "AI Business Intelligence (Tanya Data Perniagaan)",
    summary:
      "Tanya apa sahaja tentang perniagaan anda dalam bahasa harian — AI membaca data outlet anda (jualan, sewa, kos, untung rugi, tunai, stok, aset) dan menjawab. Ada juga panel analisis automatik.",
    subsections: [
      {
        title: "Pembantu Perniagaan",
        steps: [
          "Taip soalan, cth. \"Berapa pendapatan bulan ini berbanding bulan lepas?\" atau \"Unit PS mana yang paling menguntungkan?\", atau klik salah satu contoh soalan.",
          "Semasa berfikir, AI menunjukkan data yang sedang disemak. Jawapan menggunakan angka terkini outlet anda.",
        ],
      },
      {
        title: "Wawasan & Analisis",
        steps: [
          "Trend pendapatan & kos 30 hari, ramalan 7 hari, dan pengesanan angka luar biasa — dikira automatik tanpa kos.",
          "Tekan \"Jana Cadangan\" untuk meminta nasihat bertulis daripada AI.",
        ],
      },
    ],
    notes: [
      "Khas Owner dan Superuser.",
      "Percuma semasa percubaan dan termasuk dalam Pro; pada Starter memerlukan Tambahan AI di menu Langganan.",
      "Semak semula angka penting dalam laporan sebelum membuat keputusan besar.",
    ],
  },
  {
    id: "admin",
    group: "sistem",
    label: "Data Admin & Reset Data",
    navHint: "Panel jadual khas Superuser. Bahagian Padam Semua Data juga tersedia untuk Owner.",
    summary:
      "Jalan pintas untuk membetulkan data induk (produk, pelanggan, pembekal, staf, unit, baucar, akaun tunai/bank, dll.) secara terus, serta Reset Data untuk mengosongkan semua data outlet. Gunakan dengan sangat berhati-hati.",
    steps: [
      "Pilih jadual, tekan Tambah/Edit pada baris, isi, kemudian Simpan.",
      "Padam: dalam jadual yang mempunyai status aktif (produk, staf, unit, baucar, dll.) hanya menyahaktifkan; dalam jadual lain memadam secara kekal dan gagal jika baris itu masih digunakan.",
      "Padam Semua Data (Reset Penuh) — outlet ini sahaja: taip semula frasa pengesahan, masukkan kata laluan anda, kemudian tekan butang padam.",
      "Reset memadam SECARA KEKAL semua transaksi, simpan kira, produk, stok, pelanggan, perbelanjaan, aset, dan tetapan outlet ini. Hanya rekod outlet dan akaun Superuser/Owner yang tinggal.",
    ],
    notes: [
      "Data transaksi (pesanan, pembayaran, jurnal, pergerakan stok, log audit) sengaja tidak boleh diubah dari sini supaya sejarah kekal jujur.",
      "Reset tidak boleh dibatalkan dari aplikasi. Hubungi Perkhidmatan Pelanggan dahulu jika ragu.",
    ],
  },
];
