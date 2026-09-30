import type { HelpCategory } from "../../types";

export const PERAN: HelpCategory[] = [
  {
    id: "peran-kasir",
    group: "peran",
    label: "Saya Juruwang — Tugas Harian",
    summary:
      "Senarai kerja juruwang daripada buka kedai hingga pulang, mengikut urutan yang digunakan setiap hari. Jika anda juruwang baharu, kuasai topik ini dahulu.",
    roles: "Peranan Cashier (Juruwang). Supervisor, Manager, dan Owner juga boleh melakukan semua langkah ini.",
    subsections: [
      {
        title: "Semasa tiba (buka kedai)",
        steps: [
          "Log masuk dengan akaun anda sendiri — jangan menggunakan akaun rakan.",
          "Buka menu Syif & Juruwang → Buka Syif Baharu. Kira dahulu wang yang benar-benar ada di laci, kemudian isi jumlah itu sebagai Modal Awal. Jika jumlahnya berbeza daripada wang yang ditinggalkan syif sebelumnya, tulis sebabnya.",
          "Hidupkan dan semak semua unit PS, alat kawalan, dan TV. Unit yang rosak jangan disewakan — laporkan kepada penyelia supaya tiket Penyelenggaraan dibuat.",
          "Buka menu Tempahan untuk melihat tempahan hari ini, supaya unit yang sudah ditempah tidak diberikan kepada pelanggan lain.",
          "Semak ikon loceng (Notifikasi) untuk stok yang hampir habis atau mesej penting.",
        ],
      },
      {
        title: "Melayan pelanggan yang bermain di premis",
        steps: [
          "Pelanggan tiba tanpa tempahan → Sewa PS → pilih unit kosong → pilih pakej/sejam → isi nama → Mula Sesi.",
          "Pelanggan dengan tempahan → taip kod tempahan di Tempahan → Daftar Masuk.",
          "Pesanan makanan/minuman semasa bermain → tekan +F&B di kad sesinya, bukan melalui Juruwang, supaya masuk satu bil.",
          "Pelanggan mahu tambah masa → Add Time. Perhatikan penggera apabila baki masa tinggal 5 minit dan tawarkan lanjutan.",
          "Selesai → End Session & Bayar → pilih kaedah → Bayar → Cetak Resit.",
        ],
      },
      {
        title: "Menjual makanan/minuman tanpa sewa",
        steps: [
          "Buka Juruwang (POS), klik produk atau imbas kod bar, tetapkan kuantiti, pilih kaedah bayaran, tekan Bayar.",
          "Tunai: terima wang, tekan \"Sahkan Tunai Diterima\". QRIS/pindahan: tunjukkan QRIS/akaun outlet yang dipaparkan di skrin, tunggu wang masuk, kemudian tandakan diterima.",
        ],
      },
      {
        title: "Wang keluar kecil semasa bertugas",
        steps: [
          "Bayar letak kereta, beli air galon, dll → rekod ketika itu juga di Pengurusan Perbelanjaan → Cash Out Pantas. Jangan ditangguhkan, supaya tunai syif tidak berbeza.",
          "Wang diambil pemilik / disimpan ke peti besi → rekod sebagai Setoran Tunai di halaman Syif & Juruwang.",
        ],
      },
      {
        title: "Sebelum pulang (tutup syif)",
        steps: [
          "Pastikan tiada sesi yang masih berjalan untuk pelanggan yang sudah pulang — tamatkan dan selesaikan bayarannya (atau simpan sebagai bayar kemudian).",
          "Buka Syif & Juruwang → Tutup Syif. Kira wang di laci mengikut pecahan (Rp100.000, Rp50.000, dll.) tanpa melihat angka sistem.",
          "Buka aplikasi setiap e-wallet/akaun yang digunakan hari itu dan isi bakinya di bahagian Semakan Baki Bukan Tunai.",
          "Isi berapa wang yang ditinggalkan di laci untuk syif seterusnya, dan berapa yang diserahkan kepada pemilik/peti besi.",
          "Tekan Tutup Syif. Jika ada perbezaan, tulis sebab yang disyaki dalam catatan.",
          "Matikan TV/unit yang tidak digunakan, kemaskan alat kawalan, dan serahkan maklumat penting kepada syif seterusnya.",
        ],
      },
    ],
    notes: [
      "Tersalah input? Jangan panik. Pembatalan (void/refund) boleh dimohon dan diluluskan penyelia — data tidak hilang, hanya dibatalkan.",
      "Juruwang tidak boleh memberi diskaun manual melebihi had yang ditetapkan pemilik (Tetapan → Keutamaan). Diskaun melebihi had memerlukan Supervisor ke atas.",
      "Jangan sekali-kali berkongsi kata laluan akaun anda. Semua transaksi direkod atas nama akaun yang log masuk.",
    ],
  },
  {
    id: "peran-owner",
    group: "peran",
    label: "Saya Owner / Manager — Memantau Perniagaan",
    summary:
      "Apa yang sebaiknya disemak pemilik atau pengurus setiap hari, setiap minggu, dan setiap bulan — supaya perniagaan terpantau tanpa perlu sentiasa berada di outlet.",
    roles: "Owner, Manager, dan Superuser. Sebahagian menu kewangan hanya boleh diubah Owner/Accountant/Superuser (Manager boleh melihat).",
    subsections: [
      {
        title: "Setiap hari (5 minit dari telefon)",
        steps: [
          "Buka Dashboard Ringkasan: hasil hari ini, untung kasar, unit yang sedang dimainkan, baki tunai, dan kemajuan sasaran harian.",
          "Semak Notifikasi: perbelanjaan yang menunggu kelulusan anda, permohonan void/refund, stok hampir habis.",
          "Luluskan atau tolak permohonan di Staf & Kebenaran → Kelulusan dan di Pengurusan Perbelanjaan (status Pending Approval).",
          "Buka Syif & Juruwang → Sejarah Syif: lihat syif yang perbezaannya merah atau ditanda untuk disemak.",
        ],
      },
      {
        title: "Setiap minggu",
        steps: [
          "Laporan → Jualan & Sewa: unit mana paling laris dan kaedah bayaran yang paling banyak digunakan. Carta Waktu Sibuk vs Lengang di Dashboard Ringkasan membantu mengatur jadual staf dan promosi waktu lengang.",
          "Transaksi → Prestasi Juruwang: bandingkan jualan, void, diskaun, dan perbezaan tunai setiap juruwang.",
          "Inventori → Pesanan Belian: semak produk yang perlu dibeli semula.",
          "Penyelenggaraan: pastikan tiket pembaikan tidak bertimbun. Gunakan Doktor Alat Kawalan untuk memeriksa alat kawalan yang diadukan pelanggan.",
        ],
      },
      {
        title: "Setiap bulan",
        steps: [
          "Aset Tetap → Susut Nilai: jalankan susut nilai bulan itu.",
          "Perbelanjaan → Berulang: jana perbelanjaan rutin (elektrik, internet, sewa premis, gaji) yang tiba masanya.",
          "Perakaunan → Penyata Untung Rugi dan Kunci Kira-kira: lihat untung/rugi bulan ini, bandingkan dengan bulan lepas. Laporan → Kesihatan Kewangan untuk ringkasan yang lebih mudah dibaca.",
          "Perakaunan → Audit: jalankan pemeriksaan perakaunan automatik dan ikut cadangan pembetulannya.",
          "Selepas laporan bulan itu muktamad, kunci bulannya di Perakaunan → Tutup Tempoh supaya angkanya tidak berubah lagi.",
          "Semak bil langganan NEXBILL di menu Langganan supaya perkhidmatan tidak terhenti.",
        ],
      },
      {
        title: "Menetapkan peraturan outlet",
        steps: [
          "Tetapan → Perniagaan & Cukai: cukai, caj perkhidmatan, pembundaran bil, sasaran jualan, had kelulusan perbelanjaan.",
          "Tetapan → Keutamaan: had diskaun manual juruwang, ambang perbezaan tunai yang ditanda, akaun tunai yang dijumlahkan sebagai modal syif.",
          "Staf & Kebenaran: tambah/nyahaktifkan staf, keluarkan akaun yang masih log masuk di peranti lain.",
        ],
      },
    ],
    notes: [
      "Tanya apa sahaja tentang perniagaan anda kepada AI Business Intelligence (khas Owner/Superuser), cth. \"unit PS mana yang paling menguntungkan bulan ini?\".",
      "Ada beberapa cawangan? Menu Semua Outlet memaparkan hasil semua cawangan dalam satu skrin.",
    ],
  },
  {
    id: "peran-dapur",
    group: "peran",
    label: "Saya Staf Dapur — Paparan Dapur",
    summary: "Cara staf dapur menerima dan menyiapkan pesanan makanan/minuman tanpa kertas pesanan.",
    roles: "Peranan Kitchen (Dapur). Semua staf yang log masuk juga boleh membuka Paparan Dapur.",
    steps: [
      "Log masuk dengan akaun dapur, buka menu Paparan Dapur. Biarkan halaman ini terbuka di tablet/monitor dapur sepanjang waktu kerja.",
      "Tekan butang 🔊 supaya penggera pesanan berbunyi, dan \"Aktifkan Notifikasi Pelayar\" supaya pesanan baharu tetap muncul walaupun skrin berada di aplikasi lain.",
      "Pesanan baharu muncul di lajur Baharu dengan bunyi. Tekan Sahkan apabila anda mula mengendalikannya.",
      "Tekan Mula Masak apabila mula dibuat, kemudian Sedia Dihantar apabila siap — pelayan/juruwang mendengar bunyi \"Makanan Siap\".",
      "Selepas dihantar kepada pelanggan, tekan Sudah Dihantar. Pesanan hilang daripada papan.",
      "Bahan habis? Di lajur Baharu tekan Batal dan pilih sebabnya (cth. \"Bahan habis\") — juruwang akan tahu dan bil pelanggan disesuaikan.",
    ],
    notes: [
      "Papan menyegar semula secara automatik setiap beberapa saat — tidak perlu menekan muat semula.",
      "Stok bahan berkurang automatik mengikut resepi apabila menu terjual. Jika stok bahan kerap tidak sepadan, minta pemilik menyemak resepi di Inventori → Resepi / BOM.",
    ],
  },
  {
    id: "peran-akuntan",
    group: "peran",
    label: "Saya Akauntan — Perakaunan & Laporan",
    summary:
      "Tugas rutin akauntan/pentadbir kewangan di NEXBILL: memastikan semua perbelanjaan, belian, dan pelarasan direkod dengan betul, kemudian menyediakan laporan bulanan.",
    roles: "Peranan Accountant, Owner, dan Superuser (yang boleh mengubah data perakaunan). Manager hanya boleh melihat.",
    steps: [
      "Harian/mingguan: semak Pengurusan Perbelanjaan — lengkapkan lampiran bukti, bayar perbelanjaan yang direkod sebagai hutang, batalkan (void) yang salah.",
      "Semak Perakaunan → Belum Bayar (AP) dan Belum Terima (AR): bayar hutang pembekal yang tiba tempoh, rekod pelunasan belum terima pelanggan.",
      "Padankan baki akaun bank dengan penyata bank. Gunakan Perakaunan → Penyesuaian untuk mencari transaksi yang tarikh rekodnya berbeza.",
      "Hujung bulan: jalankan Susut Nilai aset, jana perbelanjaan Berulang, kemudian semak Imbangan Duga mesti seimbang.",
      "Jalankan Perakaunan → Audit dan selesaikan penemuan (cth. produk tanpa harga kos, jurnal berganda).",
      "Eksport Penyata Untung Rugi, Kunci Kira-kira, dan Aliran Tunai (Excel/PDF). Isi Nota Penyata Kewangan di tab Nota Penyata (SAK EMKM) jika diperlukan.",
      "Tutup tempoh bulan itu di Perakaunan → Tutup Tempoh selepas laporan diluluskan pemilik.",
    ],
    notes: [
      "Transaksi automatik (jualan, perbelanjaan, dll.) tidak boleh diubah terus di jurnal — pembetulannya melalui menu asalnya (cth. refund di Transaksi, void di Perbelanjaan). Ini menjaga jejak audit kekal utuh.",
      "Jika perlu membuat pembetulan selepas tempoh ditutup, rekod pembetulannya dalam tempoh semasa, jangan membuka semula tempoh lama kecuali benar-benar perlu.",
    ],
  },
];
