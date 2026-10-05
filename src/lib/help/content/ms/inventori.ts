import type { HelpCategory } from "../../types";

export const INVENTORI: HelpCategory[] = [
  {
    id: "inventory",
    group: "inventori",
    label: "Inventori (Produk, Resepi, Pembekal, Stok)",
    summary:
      "Urus produk yang dijual, resepi menu yang dimasak, pembekal, belian stok, pesanan belian (PO), dan kiraan stok fizikal (stock opname). Semua perubahan stok dan harga kos automatik masuk perakaunan.",
    subsections: [
      {
        title: "Produk",
        steps: [
          "Tambah manual: nama, kategori, harga jual, Harga Kos, stok awal, unit, stok minimum, dan pembekal utama (pilihan).",
          "Kod bar: isi semasa menambah/mengedit produk — taip, tembak dengan pengimbas USB/Bluetooth, atau tekan ikon kamera untuk imbas dari telefon/laptop. Satu kod bar hanya untuk satu produk aktif. Kod bar yang sama terus dibaca di Juruwang. Butang Imbas kamera di atas senarai produk mencari produk melalui kod barnya; jika belum didaftarkan, kod bar diisi ke borang Tambah Produk Baru. Butang imbas juga ada di Resipi/BOM, Belian Pembekal, dan Pesanan Belian untuk memilih produk.",
          "Tambah banyak sekali gus: muat turun templat Excel, isi, kemudian muat naik. Baris dengan SKU yang sudah ada akan mengemas kini produk itu (stok tidak berubah melalui muat naik).",
          "Kategori produk dan unit (pcs, gram, dll.) diatur di Tetapan → Kategori Produk dan Tetapan → Unit.",
          "Mengubah stok tanpa belian (rosak, hilang, salah kira): gunakan Pelarasan Barang — Tambah, Kurangkan (sebab Perbezaan atau Rosak/Waste), atau Tetapkan ke jumlah tertentu.",
          "Stok yang dibeli daripada pembekal jangan melalui Pelarasan Barang — gunakan Belian Pembekal atau Pesanan Belian, supaya Harga Kos turut dikira.",
        ],
        notes: [
          "Harga Kos wajib diisi. Tanpanya, laporan menganggap jualan produk untung penuh dan Penyata Untung Rugi menjadi terlalu tinggi.",
          "Padam produk (hanya Superuser) tidak memadam sejarah jualannya.",
        ],
      },
      {
        title: "Resepi / BOM (menu yang dimasak)",
        steps: [
          "Pilih untuk membuat produk baharu atau menggunakan produk makanan yang sudah ada.",
          "Isi nama resepi dan hasil (berapa hidangan bagi satu kali masak), kemudian tambah bahan: produk bahan mentah, kuantiti, dan unitnya.",
          "Simpan. Kos setiap hidangan dikira automatik daripada bahan. Setiap kali menu terjual, stok BAHAN yang berkurang.",
        ],
        notes: ["Satu produk hanya boleh mempunyai satu resepi."],
      },
      {
        title: "Pembekal",
        steps: [
          "Tambah pembekal: nama, telefon, alamat, dan terma pembayaran (hari).",
          "Pembekal yang sudah mempunyai transaksi tidak boleh dipadam — arkibkan sahaja supaya tidak muncul dalam pilihan baharu, sejarahnya kekal utuh.",
        ],
      },
      {
        title: "Belian Pembekal (beli stok terus)",
        steps: [
          "Pilih pembekal, masukkan produk, kuantiti, dan harga beli.",
          "Tambah kos pengangkutan/letak kereta/lain-lain jika ada — dibahagikan automatik kepada setiap produk supaya Harga Kos mencerminkan kos sebenar.",
          "Tandakan \"Dibayar tunai sekarang\" jika lunas; biarkan kosong jika direkod sebagai hutang kepada pembekal.",
          "Kaedah harga kos (Purata berwajaran atau FIFO — masuk dahulu, keluar dahulu) dipilih di tab ini. Jika ragu, gunakan Purata berwajaran (lalai). LIFO tidak tersedia kerana tidak dibenarkan oleh piawaian perakaunan dan cukai Indonesia.",
        ],
      },
      {
        title: "Pesanan Belian (pesanan kepada pembekal)",
        steps: [
          "\"Produk Perlu Restock\" memaparkan produk yang stoknya sudah di bawah minimum — tekan \"+ Isi ke borang PO\".",
          "\"Semak & Buat PO Automatik\" membuat draf PO untuk semua produk di bawah minimum yang mempunyai pembekal utama. Draf tetap perlu disemak dan dihantar secara manual.",
          "Buat PO manual: pilih pembekal, isi produk, kuantiti, dan harga, tekan Buat PO.",
          "Apabila barang tiba, tekan Terima Barang: stok bertambah, dan bil (hutang) kepada pembekal dibuat automatik.",
        ],
      },
      {
        title: "Stock Opname (kira stok fizikal)",
        steps: [
          "Kira stok di rak/stor, isi hasilnya di sebelah angka sistem — perbezaan terus kelihatan. Simpan sebagai draf.",
          "Imbas untuk kira: tekan \"Imbas untuk kira\" (kamera) atau tembak pengimbas ke kotak carian — setiap imbasan menambah kiraan produk itu 1. Angka masih boleh dibetulkan secara manual.",
          "Buka draf untuk menyemak perbezaan bagi setiap produk.",
          "Tekan Terapkan Pelarasan: lebihan direkod sebagai pelarasan, kekurangan sebagai waste. Tidak boleh diterapkan dua kali.",
        ],
      },
    ],
    notes: ["Kebanyakan tindakan di halaman ini (muat naik, tambah produk/resepi, PO, opname) hanya untuk Owner dan Manager."],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "assets",
    group: "inventori",
    label: "Aset Tetap (Unit PS, TV, Alat Kawalan, Perabot)",
    summary:
      "Senarai barang modal outlet (PlayStation, TV, alat kawalan, perabot, kenderaan) beserta susut nilai automatik setiap bulan, belian aset, pembaikan, dan pelupusan (dijual/rosak/hilang). Senarai boleh ditapis, dimuat turun ke Excel, dan diisi melalui muat naik Excel.",
    subsections: [
      {
        title: "Senarai Aset — melihat & menapis",
        steps: [
          "Cari mengikut nama, catatan, atau nama unit PS. Tapis mengikut kategori, status (Aktif, Penyelenggaraan, Dilupuskan, atau semua kecuali dilupuskan), dihubungkan ke unit PS atau tidak, dan julat tarikh perolehan.",
          "Di bawah penapis dipaparkan bilangan aset yang sepadan beserta jumlah kos perolehan, susut nilai terkumpul, dan nilai buku.",
          "Tekan Muat Turun Excel untuk memuat turun senarai mengikut penapis yang sedang aktif (lengkap dengan baris JUMLAH).",
        ],
      },
      {
        title: "Menambah aset",
        steps: [
          "Satu aset: tekan \"+ Aset Baharu\" — isi nama, kategori, unit PS berkaitan (pilihan), kos perolehan, nilai sisa, hayat berguna (bulan), pembekal, dan cara bayar (tunai/bank atau direkod hutang).",
          "Beberapa aset sekali gus, kos penghantaran/pemasangan, wang pendahuluan, atau aset yang sudah dimiliki sebelumnya: gunakan tab Belian Aset.",
          "Banyak aset daripada Excel: tekan Muat Naik Excel → muat turun templat → isi → pilih cara rekod (Baki awal untuk aset yang sudah dimiliki, Dibayar dari tunai/bank, atau Direkod sebagai hutang) → Semak Fail → Simpan.",
          "Semasa muat naik, fail disemak dahulu: baris yang salah dipaparkan beserta sebabnya, dan tiada apa yang disimpan sehingga semua baris betul. Baris dengan tarikh yang sama menjadi satu dokumen Belian Aset.",
        ],
        notes: [
          "Nilai sisa = anggaran harga jual apabila hayat berguna tamat. Contoh hayat berguna: PS 36 bulan, TV 60 bulan, alat kawalan 12 bulan.",
          "Tersalah muat naik? Batalkan dokumennya dari tab Belian Aset (selagi asetnya belum disusutkan atau dilupuskan).",
        ],
      },
      {
        title: "Belian Aset",
        steps: [
          "Satu dokumen belian boleh mengandungi beberapa barang. Kuantiti 3 automatik menjadi 3 aset bernombor (#1, #2, #3).",
          "Kos penghantaran/pemasangan turut dibahagikan ke kos perolehan setiap barang.",
          "Pilihan bayaran: lunas, hutang, wang pendahuluan (DP), atau baki awal. Hutang belian aset muncul di Perakaunan → Belum Bayar dan boleh dibayar secara ansuran.",
          "Belian boleh dibatalkan selagi belum ada aset di dalamnya yang disusutkan atau dilupuskan.",
        ],
      },
      {
        title: "Pembaikan & pelupusan",
        steps: [
          "+ Maintenance pada aset aktif: isi penerangan dan kos, tandakan \"Buat Perbelanjaan\" supaya kosnya direkod sebagai perbelanjaan.",
          "Lupuskan Aset (dijual, rosak teruk, hilang): isi hasil jualan (0 jika tiada), akaun tunai/bank penerima, dan sebab. Untung/rugi pelupusan dikira automatik.",
        ],
      },
      {
        title: "Susut Nilai (setiap bulan)",
        steps: [
          "Buka tab Susut Nilai, pilih bulan, lihat anggaran jumlahnya, kemudian tekan Jalankan Susut Nilai.",
          "Selamat ditekan berkali-kali: bulan yang sudah diproses atau aset yang sudah habis nilainya dilangkau secara automatik.",
          "Sejarah Susut Nilai memaparkan semua susut nilai yang sudah direkod.",
        ],
      },
    ],
    roles: "Melihat & memuat turun: semua staf yang membuka halaman ini. Menambah, muat naik, pembaikan, pelupusan, susut nilai: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "maintenance",
    group: "inventori",
    label: "Penyelenggaraan (Tiket Pembaikan)",
    summary:
      "Rekod pembaikan TV, konsol, alat kawalan, dan kelengkapan lain dari masuk bengkel hingga siap, supaya tiada kerosakan yang terlupa dan kos pembaikan direkod.",
    subsections: [
      {
        title: "Membuat & memproses tiket",
        steps: [
          "Tekan \"+ Tambah Penyelenggaraan\": pilih aset, tulis kerosakan dan kosnya, tandakan \"Buat Perbelanjaan\" jika kos perlu direkod sebagai perbelanjaan.",
          "Tiket baharu berstatus \"Masuk Penyelenggaraan\" dan asetnya automatik ditanda Penyelenggaraan.",
          "Tekan \"Mula Proses\" apabila mula dibaiki, kemudian \"Tanda Selesai\" apabila siap — aset kembali Aktif jika tiada tiket lain yang terbuka.",
          "Tiket boleh diedit bila-bila masa. Kos dikunci jika sudah dibuatkan perbelanjaan (ubah melalui menu Perbelanjaan). Tiket yang sudah dibuatkan perbelanjaan tidak boleh dipadam.",
        ],
      },
      {
        title: "Ringkasan mengikut kategori",
        steps: ["Kad di atas menunjukkan bagi setiap kategori (PlayStation, TV, Alat Kawalan, dll.): unit tersedia berbanding jumlah, dan yang sedang dibaiki."],
      },
    ],
    notes: [
      "Tidak pasti alat kawalan rosak atau tidak? Periksa dahulu dengan Doktor Alat Kawalan (Gamepad Tester) — ada pautannya di halaman ini.",
    ],
    roles: "Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "dokter-stik",
    group: "inventori",
    label: "Doktor Alat Kawalan (Gamepad Tester) & Pemacu Alat Kawalan PS3",
    navHint: "Penyelenggaraan → Gamepad Tester",
    summary:
      "Periksa alat kawalan PS3, PS4, dan PS5 terus dari pelayar: butang yang mati, analog yang bergerak sendiri (drift), keseimbangan analog, dan tekanan picu — hasilnya skor kesihatan, analisis kerosakan, dan cadangan servis.",
    subsections: [
      {
        title: "Memeriksa alat kawalan",
        steps: [
          "Buka halaman ini di Google Chrome atau Microsoft Edge di PC/komputer riba.",
          "Sambungkan alat kawalan melalui kabel USB (PS4/PS5 juga boleh melalui Bluetooth), kemudian tekan mana-mana butang sekali — pelayar hanya mengesan alat kawalan selepas ada butang ditekan.",
          "Nada naik = alat kawalan disambungkan, nada turun = terputus. Bunyi boleh dimatikan dengan butang \"Bunyi: Hidup\". Jika tiada bunyi, klik sekali pada halaman dahulu (peraturan pelayar).",
          "Tekan semua butang dan gerakkan kedua-dua analog: penunjuk menyala mengikut butang yang ditekan.",
          "Di bahagian \"Pemeriksaan terpandu (Doktor Alat Kawalan)\" tekan Mula Pemeriksaan, kemudian ikut arahan di skrin: letakkan alat kawalan di atas meja tanpa disentuh semasa kiraan, putar kedua-dua analog sepenuhnya, dan tarik L2/R2 perlahan-lahan hingga habis. Pada akhirnya muncul skor kesihatan, senarai penemuan, kemungkinan punca, dan cadangan — boleh dicetak atau disimpan sebagai PDF.",
        ],
      },
      {
        title: "Alat kawalan PS3 tidak dikesan di Windows",
        steps: [
          "Ini bukan kerosakan alat kawalan: Windows tiada pemacu terbina untuk alat kawalan PS3, jadi butangnya tidak dihantar ke pelayar.",
          "Muat turun pemacu DsHidMini daripada butang di halaman ini, pasang, kemudian sambungkan semula alat kawalan.",
          "Pemacu hanya dijamin untuk alat kawalan PS3 ASLI Sony. Banyak alat kawalan PS3 tiruan tetap tidak dikesan walaupun pemacu sudah dipasang.",
          "Tanpa memasang pemacu: buka halaman ini di Chrome telefon Android dan sambungkan alat kawalan PS3 dengan kabel OTG.",
        ],
      },
    ],
    notes: [
      "Hasil dibaca terus daripada perkakasan alat kawalan, bukan simulasi.",
      "Alat ini tidak membaca giro/adaptive trigger DualSense dan tidak mengawal getaran — khas untuk fungsi butang dan analog.",
      "Alat kawalan yang hasilnya buruk: buat tiket di Penyelenggaraan supaya direkod dan tidak disewakan kepada pelanggan.",
    ],
  },
];
