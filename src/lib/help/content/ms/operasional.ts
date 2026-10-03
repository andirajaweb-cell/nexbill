import type { HelpCategory } from "../../types";

export const OPERASIONAL: HelpCategory[] = [
  {
    id: "sop-harian",
    group: "operasional",
    label: "SOP Harian (Senarai Semak Buka–Tutup Kedai)",
    summary:
      "Senarai semak kerja harian yang sama untuk semua staf, tanpa mengira jadual — daripada buka kedai hingga serah tugas. Cetak dan tampal di meja juruwang jika perlu.",
    subsections: [
      {
        title: "Senarai semak buka kedai",
        steps: [
          "Semak semua unit PS hidup dengan normal, alat kawalan lengkap dan berfungsi, TV jelas. Alat kawalan yang bermasalah: periksa dengan Doktor Alat Kawalan (Penyelenggaraan → Gamepad Tester).",
          "Jika menggunakan kawalan TV automatik, pastikan status peranti di halaman Kawalan Peranti \"online\" dan PC juruwang yang menjalankan NexbillAgent hidup.",
          "Semak pencetak resit hidup dan kertasnya mencukupi.",
          "Buka Tempahan — lihat tempahan hari ini.",
          "Buka Notifikasi (ikon loceng) — stok hampir habis, perbelanjaan menunggu kelulusan, pengumuman daripada NEXBILL.",
          "Buka Syif baharu dengan Modal Awal mengikut wang yang benar-benar ada di laci.",
        ],
      },
      {
        title: "Semasa waktu operasi",
        steps: [
          "Pelanggan tanpa tempahan → mulakan sesi dari Sewa PS. Dengan tempahan → daftar masuk dengan kod tempahan.",
          "Makanan/minuman untuk pelanggan yang sedang bermain → +F&B di kad sesinya. Pembeli yang tidak bermain → melalui Juruwang (POS).",
          "Pantau Papan Bil Langsung untuk sesi yang hampir tamat, tawarkan lanjutan sebelum masanya berhenti.",
          "Perbelanjaan kecil → rekod terus di Perbelanjaan → Cash Out Pantas.",
          "Unit/alat kawalan rosak → keluarkan daripada sewaan (Set Maintenance) dan buat tiket di menu Penyelenggaraan.",
          "Perlu membatalkan transaksi tetapi tiada kebenaran → mohon melalui Staf & Kebenaran → Kelulusan, jangan cari jalan pintas.",
        ],
      },
      {
        title: "Senarai semak tutup kedai / tutup syif",
        steps: [
          "Tamatkan semua sesi yang pelanggannya sudah pulang dan selesaikan bayarannya.",
          "Kira wang di laci mengikut pecahan dalam borang Tutup Syif — jangan mengintai angka sistem dahulu.",
          "Isi baki setiap aplikasi bukan tunai (QRIS/e-wallet) yang tertera ketika itu.",
          "Tutup syif; tulis punca perbezaan (jika ada) dalam catatan.",
          "Matikan TV dan unit yang tidak digunakan, kemaskan alat kawalan dan aksesori, kunci laci.",
        ],
      },
      {
        title: "Serah tugas kepada syif seterusnya / pengurus",
        steps: [
          "Sampaikan: bil \"bayar kemudian\" yang belum dijelaskan (semak di Transaksi), stok yang hampir habis, unit/peranti bermasalah (pastikan sudah ada tiket Penyelenggaraan), dan perbezaan tunai (jika ada).",
          "Maklumkan permohonan kelulusan yang masih menunggu kepada orang yang berkuasa.",
        ],
      },
    ],
    notes: ["Butiran setiap ciri yang disebut di sini ada dalam topik masing-masing (Sewa PS, Juruwang, Syif & Juruwang, dll.)."],
  },
  {
    id: "ringkasan",
    group: "operasional",
    label: "Dashboard Ringkasan (Halaman Utama)",
    navHint: "Menu paling atas di bar sisi — halaman yang terbuka selepas log masuk.",
    summary:
      "Skrin pemantauan utama: hasil dan untung hari ini, bilangan transaksi, status unit PS, kedudukan tunai, carta waktu sibuk vs lengang, unit paling produktif, produk terlaris, dan stok hampir habis — semuanya dalam satu halaman.",
    subsections: [
      {
        title: "Membaca kad-kad angka",
        steps: [
          "Sasaran BEP Hari Ini: sasaran bulanan daripada Tetapan dibahagi sama rata setiap hari — dipaparkan peratus tercapai atau kekurangannya.",
          "Hasil & Untung: jumlah hasil hari ini (sewa, makanan/minuman, produk lain), perbelanjaan hari ini, untung kasar, dan anggaran untung bersih.",
          "Transaksi & Pelanggan: bilangan transaksi sah (sama dengan halaman Transaksi), bilangan pelanggan hari ini, ahli baharu, dan tempahan hari ini.",
          "Status Unit PS: berapa unit sedang digunakan, tersedia, ditempah, dalam pembaikan, dan kadar penggunaan (utilisasi) dalam peratus.",
          "Tunai & Kewangan: tunai masuk dan keluar hari ini, baki tunai, baki akaun bank, belum terima (bil pelanggan belum dijelaskan), dan hutang kepada pembekal.",
        ],
      },
      {
        title: "Carta Waktu Sibuk vs Lengang",
        steps: [
          "Memaparkan purata transaksi sehari bagi setiap jam, daripada transaksi 30 hari terakhir.",
          "Palang hijau = jam paling sibuk, palang kuning = jam paling lengang dalam waktu operasi. Palang kelabu = di luar waktu operasi (hanya sesekali ada transaksi) dan tidak dinilai.",
          "Halakan kursor/sentuh palang untuk melihat purata sehari dan jumlah 30 hari jam itu.",
          "Gunakan untuk mengatur bilangan staf setiap jam dan membuat promosi khas waktu lengang.",
        ],
      },
      {
        title: "Senarai di bahagian bawah",
        steps: [
          "Hasil setiap Unit PS (hari ini) dan unit paling produktif.",
          "Produk Terlaris Hari Ini dan Permainan Paling Banyak Dimainkan (isi nama permainan semasa memulakan sesi supaya senarai ini terisi).",
          "Stok Hampir Habis: produk yang stoknya sudah di bawah had minimum.",
          "Penyesuaian Hasil: membandingkan hasil mengikut tarikh transaksi dengan hasil dalam Penyata Untung Rugi — jika ada perbezaan, semak Perakaunan → Penyesuaian.",
        ],
      },
    ],
    notes: [
      "Angka hari ini dikira mengikut zon waktu outlet (cth. WIB), bukan zon waktu pelayan.",
      "Untung di halaman ini ialah anggaran harian. Untuk angka rasmi bulanan, gunakan Perakaunan → Penyata Untung Rugi.",
    ],
  },
  {
    id: "rental-ps",
    group: "operasional",
    label: "Sewa PS (Main di Premis)",
    summary:
      "Halaman teras untuk memulakan, mengurus, dan menamatkan sesi sewa PlayStation bagi setiap unit — termasuk tambah masa, pindah unit, tambah makanan/aksesori, kawalan TV, dan pembayaran.",
    subsections: [
      {
        title: "Memulakan sesi baharu",
        steps: [
          "Di panel \"SESI BAHARU\", pilih unit yang kosong (unit yang sedang digunakan atau dibaiki tidak muncul).",
          "Pilih Pakej (harga tetap daripada menu Promosi & Pakej) atau Sejam. Untuk Sejam, pilih tempoh (cth. 60 minit) atau \"Terbuka\" (masa berjalan terus sehingga dihentikan).",
          "Isi pelanggan: Bukan Ahli (taip nama bebas) atau Ahli (taip nama/no. telefon lalu pilih daripada hasil carian — harga & mata ahli berlaku automatik).",
          "Pilihan: isi nama permainan yang dimainkan, dan tandakan \"Pelanggan Bayar Dahulu (DP)\" jika pelanggan membayar di awal.",
          "Tekan MULA SESI. Jika unit disambungkan ke kawalan TV, TV hidup dan bertukar ke PlayStation sendiri.",
        ],
      },
      {
        title: "Semasa sesi berjalan",
        steps: [
          "Setiap unit dipaparkan sebagai kad dengan kiraan detik masa dan pecahan kos berjalan.",
          "Jeda/Sambung: menghentikan sementara kiraan masa (cth. bekalan elektrik terputus, pelanggan keluar sebentar).",
          "Add Time: tambah masa +10 hingga +120 minit.",
          "Pindah Unit: pindahkan sesi ke unit lain yang kosong — masa dan bil turut berpindah.",
          "+ Aksesori: sewa alat kawalan tambahan/VR/set kepala, dikira sejam sejak ditambah. Tekan \"Pulangkan\" untuk menghentikan kiraannya.",
          "+ F&B: tambah makanan/minuman ke bil sesi ini — pesanan terus masuk Paparan Dapur.",
          "TV On / TV Off: hidupkan/matikan TV unit ini (memerlukan peranti yang sudah dihubungkan di Kawalan Peranti).",
        ],
      },
      {
        title: "Menamatkan sesi & menerima bayaran",
        steps: [
          "Tekan \"End Session & Bayar\". Bil akhir dipaparkan: sewa + aksesori + makanan/minuman.",
          "Pilihan: isi Diskaun, tandakan Cukai, atau masukkan kod baucar/ganjaran pelanggan.",
          "Isi jumlah bayaran (lalai: baki bil penuh), pilih kaedah pembayaran, tekan Bayar.",
          "Tunai terus selesai. QRIS/pindahan/e-wallet: pelanggan membayar ke QRIS/akaun outlet yang dipaparkan di skrin, kemudian tekan \"Tandakan Diterima\" selepas wang masuk dan isi nombor rujukannya jika ada.",
          "Boleh bayar sebahagian dengan satu kaedah lalu bakinya dengan kaedah lain (split payment).",
          "Pelanggan akan bayar kemudian? Tekan \"Tutup (bayar kemudian di POS)\" — bil disimpan dan boleh dijelaskan dari Juruwang (POS) atau Transaksi.",
          "Cetak resit daripada kad sesi yang sudah selesai.",
        ],
      },
      {
        title: "Urus unit PS",
        steps: [
          "Tekan \"Urus Unit\" untuk menambah/mengubah unit: nama, konsol, jenis TV, kadar sejam.",
          "Set Maintenance: keluarkan unit daripada sewaan buat sementara (tidak boleh semasa unit sedang digunakan).",
          "Nyahaktifkan: arkibkan unit yang tidak digunakan lagi — sejarahnya tetap disimpan.",
          "Unit yang jam penggunaannya sudah melepasi had servis (diatur di Tetapan → Notifikasi → Penyelenggaraan Prediktif Unit) mendapat tanda \"perlu servis\".",
        ],
      },
    ],
    notes: [
      "Sesi dengan tempoh tertentu berhenti sendiri apabila masanya tamat — tetapi pembayarannya tetap perlu diselesaikan juruwang.",
      "Penggera berbunyi sekali apabila baki masa tinggal 5 minit.",
      "Semua staf yang log masuk boleh memulakan dan menamatkan sesi.",
    ],
  },
  {
    id: "billing-board",
    group: "operasional",
    label: "Papan Bil Langsung (Skrin Pantau)",
    summary:
      "Skrin khas untuk memantau semua sesi yang sedang berjalan secara langsung — sesuai dipasang di TV/monitor kedua di kawasan juruwang. Hanya untuk dilihat, tiada butang tindakan.",
    steps: [
      "Buka menu Papan Bil Langsung di skrin tambahan dan biarkan terbuka.",
      "Halaman menyegar semula setiap 3 saat.",
      "Setiap kad memaparkan: nama unit & konsol, status main/jeda, nama pelanggan & permainan, masa berjalan, lanjutan, dan pecahan kos.",
      "Kotak ringkasan di atas: bilangan sesi aktif, yang bermain vs dijeda, pesanan makanan yang sedang diproses, dan jumlah bil berjalan.",
    ],
    notes: ["Semua tindakan (bayar, tambah masa, dll.) tetap dilakukan di halaman Sewa PS."],
  },
  {
    id: "booking",
    group: "operasional",
    label: "Tempahan (Reservasi)",
    summary:
      "Urus tempahan unit PS terlebih dahulu — rekod tempahan, terima tempahan dalam talian daripada pelanggan, daftar masuk pantas dengan kod, pindah unit, dan tandakan pelanggan yang tidak hadir.",
    subsections: [
      {
        title: "Merekod tempahan baharu",
        steps: [
          "Isi nama dan nombor telefon pelanggan.",
          "Pilih unit tertentu, atau \"Mana-mana unit\" + jenis konsol.",
          "Isi masa mula dan tamat, pilihan wang pendahuluan (DP) dan catatan, kemudian tekan \"Buat Tempahan\".",
          "Jika jadual bertembung, tempahan automatik masuk Senarai Menunggu dan kedudukannya dipaparkan.",
        ],
      },
      {
        title: "Tempahan dalam talian oleh pelanggan",
        steps: [
          "Hidupkan \"terima tempahan dalam talian\" dan salin pautan halaman tempahan outlet di Tetapan → Perniagaan & Cukai → Tempahan / Reservasi.",
          "Kongsikan pautannya di WhatsApp, Instagram, atau Google Maps. Pelanggan melihat unit yang kosong, memilih masa, dan mendapat kod tempahan.",
          "Tetapkan jeda antara tempahan, had masa daftar masuk (tempahan yang tidak hadir dilepaskan automatik), dan tempoh minimum menempah sebelum masa bermain.",
          "Sepanduk promosi di halaman tempahan diatur di Tetapan → Sepanduk Iklan.",
        ],
      },
      {
        title: "Apabila pelanggan tiba & tindakan lain",
        steps: [
          "Taip kod tempahan (cth. BK-00001) di kotak carian atas → tekan Enter/\"Cari & Daftar Masuk\".",
          "Sahkan: meluluskan tempahan yang masih menunggu atau dalam senarai menunggu.",
          "QR: paparkan kod QR tempahan untuk pelanggan.",
          "Pindah Unit: pindahkan tempahan ke unit lain (sebab pilihan).",
          "No-show: tandakan pelanggan yang tidak hadir. Batal: membatalkan tempahan (sebab wajib).",
        ],
      },
    ],
    notes: [
      "Peringatan automatik kepada pelanggan melalui WhatsApp buat masa ini tidak aktif — hubungi pelanggan secara manual melalui nombor dalam tempahan jika perlu.",
      "Warna label menunjukkan asal tempahan: Juruwang (direkod staf), Dalam Talian (halaman tempahan), atau WhatsApp.",
    ],
    roles: "Rekod/sahkan/daftar masuk/batal: Owner, Superuser, Manager, Supervisor, Cashier. Membatalkan status No-show: Owner/Superuser.",
  },
  {
    id: "pos",
    group: "operasional",
    label: "Juruwang (POS) — Jual Makanan, Minuman & Barang",
    summary:
      "Untuk menjual produk (makanan, minuman, barang) kepada pembeli yang tidak sedang menyewa — atau untuk menjelaskan bil yang disimpan \"bayar kemudian\". Masa sewa PS tidak dijual di sini, tetapi di Sewa PS.",
    subsections: [
      {
        title: "Menjual produk",
        steps: [
          "Klik produk dalam senarai (dikumpulkan mengikut kategori), atau taip nama/imbas kod bar di kotak carian. Jika hanya satu produk yang sepadan, tekan Enter dan produk terus masuk troli.",
          "Tetapkan kuantiti dengan butang +/- di troli.",
          "Pilihan: isi Diskaun, masukkan kod baucar (tekan Semak), tandakan Cukai/Caj Perkhidmatan.",
          "Pilih kaedah pembayaran lalu tekan Bayar.",
          "Tunai: terima wangnya, tekan \"Sahkan Tunai Diterima\". QRIS/pindahan: tunjukkan QRIS/akaun outlet di skrin, tunggu wang masuk, kemudian tandakan diterima.",
          "Tekan Cetak Resit.",
        ],
      },
      {
        title: "Bil terbuka (Open Orders)",
        steps: [
          "Bil yang belum dibayar (cth. daripada sesi sewa yang \"bayar kemudian\") dipaparkan di bahagian Open Orders.",
          "Split: pecahkan satu bil kepada beberapa bahagian (cth. kawan-kawan berkongsi bayar).",
          "Gabung: tandakan 2 bil atau lebih lalu tekan \"Gabung N Order\" supaya dibayar sekali gus.",
        ],
      },
    ],
    notes: [
      "Kandungan troli disimpan dalam pelayar — bertukar menu atau muat semula tidak menghilangkannya.",
      "Produk kategori \"Sewa Peranti\" tidak dipaparkan di sini kerana ia sebahagian daripada Sewa Rumah (Home Rental).",
      "Diskaun manual juruwang dihadkan mengikut had yang ditetapkan pemilik di Tetapan → Keutamaan.",
    ],
  },
  {
    id: "kitchen",
    group: "operasional",
    label: "Paparan Dapur (Kitchen Display)",
    summary:
      "Papan pesanan dapur tanpa kertas: semua pesanan makanan/minuman daripada Juruwang dan daripada sesi sewa muncul di sini, dalam 4 lajur mengikut peringkatnya.",
    steps: [
      "Pesanan baharu masuk lajur Baharu dengan bunyi penggera.",
      "Urutan butang: Sahkan → Mula Masak → Sedia Dihantar → Sudah Dihantar (hilang daripada papan).",
      "Pesanan di lajur Baharu boleh dibatalkan dengan butang Batal dan sebabnya (cth. \"Bahan habis\").",
      "Butang 🔊/🔇 menghidupkan/mematikan bunyi. \"Aktifkan Notifikasi Pelayar\" supaya pesanan tetap muncul walaupun skrin berada di aplikasi lain.",
    ],
    notes: [
      "Papan menyegar semula secara automatik setiap beberapa saat.",
      "Pesanan yang baru \"Siap\" berbunyi berbeza, supaya pelayan tahu perlu menghantarnya.",
      "Lihat juga topik \"Saya Staf Dapur\" dalam kumpulan Panduan Peranan.",
    ],
  },
  {
    id: "shift",
    group: "operasional",
    label: "Syif & Juruwang (Laci Wang)",
    summary:
      "Buka syif dengan modal awal, rekod wang yang disetor atau dipindahkan, kemudian tutup syif dengan mengira wang mengikut pecahan. Sistem membandingkan kiraan anda dengan catatan transaksi supaya perbezaan tunai terus diketahui.",
    subsections: [
      {
        title: "Membuka syif",
        steps: [
          "Kira dahulu wang yang ada di laci sekarang, isi hasilnya sebagai Modal Awal, kemudian tekan Buka Syif.",
          "Jika jumlahnya berbeza daripada wang yang ditinggalkan syif sebelumnya, sistem meminta sebab (cth. \"pemilik mengambil Rp100.000 untuk membeli barang\") dan menandakannya untuk disemak.",
          "Secara lalai hanya satu syif boleh dibuka bagi setiap outlet, supaya perbezaan jelas milik siapa. Outlet dengan beberapa laci boleh membenarkan beberapa syif di Tetapan → Keutamaan.",
        ],
      },
      {
        title: "Semasa syif",
        steps: [
          "Semua bayaran tunai (sewa, juruwang, PPOB, keahlian, pendapatan lain) automatik masuk kiraan tunai syif yang sedang dibuka.",
          "Rekod Setoran Tunai: apabila wang dari laci diserahkan kepada pemilik, peti besi, atau disetor ke bank.",
          "Mohon Pindah Tunai: apabila wang dipindahkan antara tempat tunai (cth. tambahan modal daripada Tunai Besar ke laci). Sejarah setoran dan pindah tunai disimpan di halaman ini.",
        ],
      },
      {
        title: "Menutup syif",
        steps: [
          "Isi bilangan helai/keping bagi setiap pecahan wang — jumlah dikira automatik. Jangan melihat angka sistem dahulu (kiraan \"buta\").",
          "Isi Semakan Baki Bukan Tunai: buka aplikasi/dashboard setiap e-wallet atau baki deposit yang digunakan, isi baki yang tertera ketika itu.",
          "Isi wang yang ditinggalkan di laci untuk syif seterusnya; bakinya dianggap diserahkan kepada pemilik/peti besi.",
          "Tambah catatan jika ada perbezaan yang sudah diketahui, kemudian tekan Tutup Syif.",
          "Ringkasan Tutup Syif memaparkan: Modal Awal, Wang Masuk, Wang Keluar, Jangkaan Tunai (yang sepatutnya ada), kiraan anda, dan Perbezaan. Merah = kurang, kuning = lebih.",
        ],
      },
      {
        title: "Menutup syif milik juruwang lain",
        steps: [
          "Jika juruwang pulang tanpa menutup syif, penyelia boleh menutupnya: kira wang di laci secara fizikal dan tulis sebabnya (wajib).",
          "Penutupan ini direkod atas nama orang yang menutup dan ditanda untuk disemak.",
        ],
      },
      {
        title: "Saluran baki deposit (bukan tunai)",
        steps: [
          "Senarai baki yang wajib disemak setiap kali tutup syif (cth. Baki Deposit PPOB). Saluran lalai boleh ditukar nama tetapi tidak boleh dipadam.",
          "Tambah saluran baharu dengan mengisi namanya lalu \"Tambah Saluran\" — akaun perakaunannya dibuat automatik.",
        ],
        notes: ["Bahagian ini hanya kelihatan kepada Owner, Superuser, dan Accountant."],
      },
    ],
    notes: [
      "Syif yang perbezaannya atau bilangan void/refund-nya melebihi ambang (Tetapan → Keutamaan) automatik ditanda untuk disemak Owner/Manager. Juruwang tetap boleh menutup syif.",
      "Cadangan Modal Awal diambil daripada akaun tunai yang ditanda di Tetapan → Keutamaan → Komposisi Modal Awal Syif. Itu hanya cadangan — tetap isi mengikut wang fizikal.",
    ],
  },
  {
    id: "devices",
    group: "operasional",
    label: "Kawalan Peranti (TV & Smart Plug)",
    summary:
      "Hidupkan/matikan TV dan konsol dari dashboard, dan biarkan TV hidup/mati sendiri mengikut sesi. Android TV dikawal melalui aplikasi NexbillAgent di PC juruwang; TV biasa (analog atau smart TV bukan Android) melalui smart plug.",
    subsections: [
      {
        title: "Memilih cara kawalan yang tepat",
        steps: [
          "Android TV / Google TV → gunakan NexbillAgent (tanpa alat tambahan). TV boleh dihidupkan, dimatikan, dan ditukar ke HDMI PlayStation secara automatik.",
          "TV analog/tiub, TV digital biasa, dan smart TV bukan Android (Viva OS, Hisense OS, webOS, dll.) → memerlukan smart plug yang memutuskan/menyambung bekalan elektriknya.",
          "Jika outlet mempunyai unit dengan TV bukan Android yang belum disambungkan ke smart plug, halaman ini memaparkan amaran dan butang \"Lihat Cadangan Smart Plug\" ke produk yang sesuai.",
        ],
      },
      {
        title: "Android TV melalui NexbillAgent (5 langkah, sekali bagi setiap outlet)",
        steps: [
          "Langkah 1 — Minta Token: tekan \"Minta Token Relay Agent\". Balasan berisi token rahsia dihantar pasukan NEXBILL melalui menu Perkhidmatan Pelanggan.",
          "Langkah 2 — Muat turun NexbillAgent dan ekstrak ke PC juruwang (Windows). Baca \"Panduan Lengkap NexbillAgent\" — tersedia dalam 6 bahasa, mengandungi persediaan PC & TV, cara mengunci IP TV, dan 28 masalah lazim beserta penyelesaiannya.",
          "Langkah 3 — Jalankan NexbillAgent dan tampal tokennya.",
          "Langkah 4 — Sediakan setiap TV (sekali bagi setiap TV): sambungkan ke WiFi yang sama, aktifkan pilihan yang diminta panduan, kunci IP-nya.",
          "Langkah 5 — Tambah TV di halaman ini (isi IP TV) kemudian hubungkan ke unit sewanya.",
        ],
      },
      {
        title: "Smart plug",
        steps: [
          "Smart plug rasmi NEXBILL: isi nombor siri yang tertera pada label di bahagian \"Tuntut Smart Plug NEXBILL\" — tiada tetapan lain diperlukan.",
          "Tasmota: isi nama dan topik MQTT peranti.",
          "Tuya / Smart Life: setiap outlet menggunakan akaun Tuya Cloud API sendiri — boleh lebih daripada satu akaun. Tambah akaun (Access ID & Secret) di Tetapan → Perniagaan & Cukai → Integrasi Tuya Cloud API, kemudian tambah peranti dengan Device ID-nya. Jika ada beberapa akaun, biarkan pilihan akaun \"Automatik\": sistem mencari sendiri akaun yang memiliki Device ID itu.",
          "Selepas ditambah, hubungkan peranti ke unit dalam jadual \"Hubungkan Peranti ke Unit Sewa\".",
        ],
        notes: [
          "Akaun Tuya Cloud percuma (Trial) hanya boleh mengawal kira-kira 8 peranti dan perlu dilanjutkan kira-kira sebulan sekali di iot.tuya.com (Service API → IoT Core → Extend Trial). Ada palam pintar lebih daripada itu? Buat akaun Tuya Cloud kedua (e-mel lain), pautkan sebahagian palam pintar ke akaun itu, kemudian tambahkan sebagai akaun baharu di Tetapan. Jika satu akaun terlupa dilanjutkan, semua palam pintar dalam akaun itu berhenti bertindak balas — catat tarikh lanjutan setiap akaun dalam kalendar.",
          "Semasa tempoh percubaan langganan, smart plug belum boleh ditambah dan kawalan Android TV dihadkan kepada 1 unit.",
        ],
      },
      {
        title: "Penggunaan harian",
        steps: [
          "Semua staf boleh menekan Hidupkan/Matikan di kad peranti, atau TV On/TV Off di kad sesi Sewa PS.",
          "Status online/offline setiap peranti kelihatan di halaman ini. Peranti offline masih boleh dihidupkan secara manual dengan alat kawalan jauh.",
          "Dengan NexbillAgent terkini, TV automatik bertukar ke PlayStation apabila sesi bermula dan ke paparan TV Screensaver apabila sesi tamat (lihat topik TV Screensaver).",
        ],
      },
    ],
    roles: "Menghidupkan/mematikan: semua staf. Menambah/mengubah/memadam/menghubungkan peranti: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "qr-pelanggan",
    group: "operasional",
    label: "QR Pelanggan per Bilik & Amaran Masa di TV",
    navHint: "Sewa PS → Urus Unit → QR Pelanggan",
    summary:
      "Setiap bilik ada pelekat QR. Pelanggan cuma imbas dengan telefon untuk melihat baki masa dan anggaran bil, memesan makanan/minuman, minta tambah masa, atau memanggil juruwang — tanpa perlu ke kaunter. Semua permintaan masuk ke panel Permintaan Pelanggan di Sewa PS dan hanya berkuat kuasa selepas juruwang menerimanya. Android TV juga boleh memaparkan amaran baki masa dan skrin Masa Tamat.",
    subsections: [
      {
        title: "Memasang QR di bilik",
        steps: [
          "Buka Sewa PS → Urus Unit → tekan \"QR Pelanggan\" pada unit. QR dibuat secara automatik.",
          "Tekan \"Cetak pelekat semua unit\" untuk mencetak QR semua unit sekali gus, gunting, kemudian tampal berhampiran TV setiap bilik.",
          "Atur kebenarannya dalam tetingkap yang sama: benarkan pesanan F&B dari telefon, benarkan minta tambah masa dari telefon. Panggil juruwang sentiasa aktif.",
          "Jika QR difoto dan disalah guna, tekan \"Tukar QR\" — pelekat lama terus tidak sah, cetak yang baharu.",
        ],
      },
      {
        title: "Apa yang boleh dilakukan pelanggan dari telefon",
        steps: [
          "Melihat baki masa bermain (berjalan setiap saat) dan anggaran bil berjalan. Amaran muncul apabila baki masa ≤5 minit.",
          "Pesan makanan/minuman: pilih menu, atur kuantiti, hantar. Harga diambil daripada data produk, bukan dari telefon.",
          "Minta tambah masa: +30/+60/+90/+120 minit, lengkap dengan anggaran kos.",
          "Panggil juruwang: minta bil, alat kawalan bermasalah, perlu bantuan, atau lain-lain (boleh tambah catatan). Status setiap permintaan kelihatan di telefon: menunggu, diterima, atau ditolak beserta sebabnya.",
        ],
      },
      {
        title: "Membalas permintaan (juruwang)",
        steps: [
          "Permintaan baharu muncul di panel \"Permintaan Pelanggan (QR Bilik)\" di bahagian atas Sewa PS, disertai bunyi.",
          "Pesanan F&B: tekan \"Terima & masukkan ke bil\" — item masuk bil sesi dan terus dipaparkan di Paparan Dapur.",
          "Tambah masa: tekan \"Terima & tambah masa\" — tempoh sesi bertambah. Panggil juruwang: pergi ke bilik kemudian tekan \"Sudah diuruskan\".",
          "Tekan \"Tolak\" jika tidak dapat dilayan (cth. menu habis); sebab yang diisi kelihatan di telefon pelanggan.",
        ],
      },
      {
        title: "Amaran baki masa & skrin Masa Tamat di TV",
        navHint: "Tetapan → TV Screensaver → Amaran Masa & Skrin Masa Tamat",
        steps: [
          "Khas untuk Android TV yang automasinya sudah aktif dan disahkan (NexbillAgent v1.2).",
          "Amaran baki masa (mati secara lalai): beberapa minit sebelum tamat, TV beralih sebentar ke skrin besar \"BAKI MASA\" berserta QR bilik, kemudian kembali sendiri ke HDMI PlayStation. Atur minit dan tempoh paparannya.",
          "Skrin \"MASA TAMAT\": selepas sesi berhenti automatik dan bil belum dibayar, TV mengajak pelanggan menyelesaikan pembayaran di juruwang (tanpa jumlah), sehingga dibayar atau 15 minit.",
          "Amaran dihantar sekali bagi setiap sesi dan berlaku semula selepas masa ditambah.",
        ],
      },
    ],
    notes: [
      "Permintaan dari telefon tidak pernah mengubah bil dengan sendirinya — juruwang yang memutuskan. Pesanan untuk sesi yang sudah tamat tidak boleh diterima; layan terus melalui Juruwang.",
      "Halaman telefon tidak memaparkan nama atau nombor pelanggan, dan menggunakan bahasa mengikut Negara outlet.",
      "Amaran TV dan penghentian sesi automatik bergantung pada penjadual NEXBILL yang berjalan di pelayan.",
    ],
    roles: "Semua staf yang log masuk boleh membalas permintaan dan memaparkan/mencetak QR. Mengubah kebenaran QR dan tetapan amaran TV: Owner, Superuser, Manager.",
  },
  {
    id: "tv-screensaver",
    group: "operasional",
    label: "TV Screensaver (Skrin Promosi di Bilik)",
    navHint: "Tetapan → TV Screensaver (modul perlu dihidupkan dahulu di Tetapan → Feature Management).",
    summary:
      "Apabila unit tidak digunakan, TV Android di bilik memaparkan nama outlet, harga, QR tempahan, jam, dan status unit (TERSEDIA / baki masa) — kemudian boleh dibuka staf dengan PIN. Khas TV Android; TV analog dan smart TV bukan Android tidak disokong.",
    subsections: [
      {
        title: "Menetapkan paparan",
        steps: [
          "Isi Tajuk besar (cth. \"Nak Main?\"), baris konsol (cth. \"PS5 • PS4 • PS3\"), baris harga (cth. \"Dari Rp5.000/jam\"), dan baris tambahan (promosi, waktu buka).",
          "Tetapkan selepas berapa minit tidak digunakan skrin muncul.",
          "Pilih apa yang dipaparkan: jam & tarikh, status unit, QR tempahan, dan nama WiFi (kata laluan WiFi tidak pernah dipaparkan).",
          "Tetapkan PIN Staf supaya skrin hanya boleh ditutup staf. Tanpa PIN, sesiapa yang menekan alat kawalan jauh boleh menutupnya.",
          "Mod Malam: malapkan skrin pada waktu tertentu (maksimum 90% — skrin tidak pernah gelap sepenuhnya supaya tidak disangka TV mati).",
        ],
      },
      {
        title: "Memasang skrin di TV",
        steps: [
          "Di bahagian \"Skrin Terpasang\", tambah skrin: beri nama dan pilih unit sewa (TV Android) — muncul kod 6 angka.",
          "Di TV, buka pelayar dan taip alamat nexbill.id/tv.",
          "Masukkan kod 6 angka menggunakan butang nombor pada alat kawalan jauh. Skrin terus disambungkan ke unit itu.",
          "Ulangi untuk setiap TV. Skrin tanpa unit boleh digunakan untuk penjenamaan sahaja (cth. TV di ruang menunggu).",
        ],
      },
    ],
    notes: [
      "Kandungan skrin beralih perlahan-lahan supaya panel TV tidak meninggalkan bayang kekal.",
      "Jika internet terputus seketika, skrin tetap memaparkan paparan terakhir dan terus cuba menyambung semula.",
      "Soal elektrik: TV yang hidup berterusan menambah kos kira-kira Rp25.000–50.000 bagi setiap TV sebulan. Gunakan Mod Malam atau matikan TV di luar waktu operasi.",
    ],
  },
  {
    id: "home-rental",
    group: "operasional",
    label: "Sewa Rumah (Home Rental — Sewa Bawa Pulang)",
    navHint: "Muncul di bar sisi selepas modul dihidupkan di Tetapan → Feature Management (khas Superuser).",
    summary:
      "Modul berasingan untuk menyewakan PS, Playbox, TV, dan aksesori yang DIBAWA PULANG pelanggan — daripada tempahan, serah terima dengan deposit, hingga pemulangan dengan pemeriksaan keadaan dan penilaian pelanggan.",
    subsections: [
      {
        title: "Persediaan (sekali di awal)",
        steps: [
          "Tab Dasar: isi deposit, denda lewat, caj hantar-ambil mengikut jarak, peraturan kerosakan, senarai semak pemulangan, dan peraturan yang dicetak pada resit/perjanjian sewa.",
          "Tab Katalog Produk: tetapkan kadar setiap 12 jam, harian, setiap hari tambahan, dan mingguan bagi setiap produk.",
          "Tab Aset: daftarkan setiap barang fizikal dengan kodnya (cth. PS5-001). Status aset: Tersedia, Ditempah, Disediakan, Disewa, Dihantar, Dipulangkan, Diperiksa, Rosak, Hilang, Dibaiki, Bersara.",
          "Tab Pakej: gabungkan beberapa produk dalam satu pakej (cth. PS4 + TV 32\").",
        ],
      },
      {
        title: "Membuat tempahan & serah terima (checkout)",
        steps: [
          "Tab Tempahan → buat tempahan: pilih pelanggan, produk/pakej, tarikh mula dan rancangan pulang. Isi jarak dari kedai jika dihantar (kosongkan untuk caj hantar tetap).",
          "Untuk pengesahan, rekod identiti pelanggan (kad pengenalan, atau kad pelajar dan maklumat ibu bapa/penjaga bagi penyewa bawah umur).",
          "Kadar dikira automatik: ≤12 jam, harian, 2–3 hari (harian + hari tambahan), 7 hari ke atas menggunakan kadar mingguan.",
          "Apabila pelanggan tiba/barang dihantar, lakukan Checkout: aset diperuntukkan, bayaran dan deposit direkod. Pastikan senarai semak kelengkapan (kabel HDMI, pengecas, alat kawalan) sudah diperiksa.",
          "Tab Peta Tarikh: klik tarikh untuk melihat semua tempahan pada hari itu.",
        ],
      },
      {
        title: "Pemulangan (return)",
        steps: [
          "Tandakan semua item senarai semak pemulangan (wajib).",
          "Beri penilaian bintang 1–5 dan catatan tentang keadaan barang/tingkah laku pelanggan.",
          "Ada kerosakan? Isi kos kerosakan — ditolak daripada deposit dahulu. Jika melebihi deposit, bakinya dikenakan dengan kaedah bayaran yang dipilih.",
          "Lewat? Denda dikira automatik mengikut Dasar.",
          "Selepas pemulangan, aset kembali Tersedia dan status deposit direkod: dilepaskan penuh, ditolak sebahagian, atau hangus.",
        ],
      },
      {
        title: "Risiko & Kelulusan",
        steps: [
          "Lihat sejarah sewa dan skor risiko pelanggan (daripada kelengkapan identiti, pengesahan alamat & nombor WhatsApp aktif, kelewatan, tidak hadir, barang rosak/hilang).",
          "Tempahan pelanggan berisiko tinggi perlu diluluskan dahulu — tekan Luluskan atau Tolak.",
          "Pelanggan bermasalah boleh dimasukkan ke senarai hitam.",
        ],
      },
    ],
    notes: [
      "Semua pendapatan Sewa Rumah (sewa, hantar-ambil, denda, ganti rugi) automatik masuk perakaunan dan dipaparkan di Laporan → Sewa Rumah.",
      "Deposit direkod berasingan daripada pendapatan sehingga barang dipulangkan.",
      "Peringatan automatik kepada pelanggan (jadual ambil, tarikh akhir) belum aktif — ingatkan pelanggan secara manual.",
    ],
  },
];
