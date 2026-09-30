import type { HelpCategory } from "../../types";

export const BANTUAN: HelpCategory[] = [
  {
    id: "masalah-umum",
    group: "bantuan",
    label: "Masalah Biasa & Penyelesaian",
    summary:
      "Masalah yang paling kerap dihadapi outlet, beserta langkah penyelesaiannya. Cuba langkah ini dahulu sebelum menghubungi Perkhidmatan Pelanggan.",
    subsections: [
      {
        title: "Tidak boleh log masuk",
        steps: [
          "\"Akaun sedang aktif di peranti lain\": log keluar dahulu di peranti sebelumnya, tunggu 30 minit, atau minta Owner menekan \"Log keluarkan\" di Staf & Kebenaran.",
          "Terlupa kata laluan: tekan \"Lupa kata laluan\" di halaman log masuk dan buka pautan dalam e-mel anda (semak juga folder Spam).",
          "Akaun dinyahaktifkan: minta Owner/Manager mengaktifkannya semula.",
        ],
      },
      {
        title: "TV tidak hidup/mati secara automatik",
        steps: [
          "Semak status peranti di Kawalan Peranti. Jika luar talian: pastikan PC juruwang yang menjalankan NexbillAgent hidup dan disambungkan ke internet.",
          "Android TV: pastikan TV dan PC juruwang berada dalam WiFi yang sama dan IP TV tidak berubah (kunci IP seperti dalam Panduan NexbillAgent). Lihat 28 masalah biasa (kod P01–P28) dalam Panduan Lengkap NexbillAgent.",
          "Semua palam pintar Tuya tiba-tiba tidak bertindak balas: kemungkinan Tuya Cloud Trial sudah tamat — lanjutkan di iot.tuya.com.",
          "TV bukan Android: wajib menggunakan palam pintar. Tekan \"Lihat Cadangan Palam Pintar\" di Kawalan Peranti.",
          "Sementara belum dibaiki, hidupkan TV secara manual dengan alat kawalan jauh — sesi sewa tetap berjalan seperti biasa.",
        ],
      },
      {
        title: "Alat kawalan tidak dikesan di Gamepad Tester",
        steps: [
          "Gunakan Chrome atau Edge, sambungkan alat kawalan, kemudian tekan mana-mana butang sekali.",
          "Alat kawalan PS3 di Windows memerlukan pemacu DsHidMini (butang muat turun di halaman Gamepad Tester). Alat kawalan PS3 tiruan selalunya tetap tidak dikesan.",
          "Cuba kabel USB lain — banyak kabel murah hanya untuk mengecas dan tidak membawa data.",
        ],
      },
      {
        title: "Perbezaan tunai semasa tutup syif",
        steps: [
          "Semak perbelanjaan kecil yang belum direkod (letak kereta, air galon) — rekodkan melalui Perbelanjaan → Tunai Keluar Pantas.",
          "Semak wang yang diambil pemilik/disetor tetapi tidak direkod sebagai Setoran Tunai.",
          "Semak menu Transaksi untuk bayaran yang sepatutnya QRIS/pindahan tetapi direkod sebagai tunai (atau sebaliknya).",
          "Semak baki yang tersalah beri dan bil \"bayar kemudian\" yang sebenarnya sudah dibayar tunai.",
          "Tulis kemungkinan puncanya dalam catatan syif supaya pemilik boleh menyusul.",
        ],
      },
      {
        title: "Terlupa tutup syif / tidak boleh buka syif",
        steps: [
          "Hanya satu syif boleh dibuka bagi setiap outlet (kecuali dibenarkan di Keutamaan). Jika juruwang sebelumnya terlupa menutup, penyelia boleh menutup syif itu: kira laci dan tulis sebabnya.",
          "Kemudian buka syif baharu seperti biasa.",
        ],
      },
      {
        title: "Stok negatif atau tidak sepadan",
        steps: [
          "Stok yang dibeli mesti direkod melalui Belian Pembekal/Pesanan Belian, bukan sekadar diletakkan di rak.",
          "Menu yang dimasak: pastikan resepinya betul — stok bahan yang berkurang, bukan stok menu.",
          "Lakukan Stock Opname untuk menyamakan stok sistem dengan stok fizikal.",
        ],
      },
      {
        title: "Untung kelihatan terlalu tinggi",
        steps: [
          "Kemungkinan besar ada produk yang Harga Kosnya kosong. Isi di Inventori → Produk; halaman Penyata Untung Rugi juga memaparkan amaran.",
          "Pastikan perbelanjaan rutin (elektrik, gaji, sewa) sudah direkod dan susut nilai aset bulan itu sudah dijalankan.",
        ],
      },
      {
        title: "Resit tidak tercetak / terpotong",
        steps: [
          "Pastikan pencetak hidup, kertas dimasukkan, dan pencetak dipilih dalam dialog cetak pelayar.",
          "Atur lebar kertas (58mm/80mm) di Tetapan → Perniagaan & Cukai → Pencetak, kemudian \"Simpan untuk Komputer Ini\".",
        ],
      },
      {
        title: "Bayaran QRIS belum disahkan",
        steps: [
          "Semak aplikasi bank/QRIS outlet — pastikan wang benar-benar masuk (jangan hanya bergantung pada tangkapan skrin pindahan daripada pelanggan).",
          "Selepas masuk, tekan \"Tanda Diterima\" dan isi nombor rujukan.",
        ],
      },
      {
        title: "Butang yang saya perlukan tiada",
        steps: [
          "Mungkin peranan anda tiada kebenaran. Padam kekal, tebus mata, dan tetapan kebenaran hanya untuk Superuser.",
          "Mungkin modulnya dimatikan — semak Tetapan → Feature Management (Superuser).",
          "Masih keliru? Hantar tangkapan skrin melalui Perkhidmatan Pelanggan.",
        ],
      },
      {
        title: "Tidak boleh merekod jurnal pada bulan lepas",
        steps: [
          "Bulan itu sudah ditutup di Perakaunan → Tutup Tempoh. Rekod pembetulan dengan tarikh hari ini, atau minta Owner/Accountant membuka semula tempoh hanya jika benar-benar perlu.",
        ],
      },
    ],
    notes: ["Masih belum selesai? Buka Perkhidmatan Pelanggan, terangkan apa yang sudah dicuba, dan lampirkan foto/video skrin."],
  },
  {
    id: "kamus-istilah",
    group: "bantuan",
    label: "Glosari Istilah",
    summary: "Penerangan ringkas dalam bahasa harian untuk istilah yang kerap anda lihat di NEXBILL.",
    subsections: [
      {
        title: "Operasi",
        steps: [
          "Sesi — satu kali sewa pada satu unit, dari Mula hingga Tamat Sesi.",
          "Unit / Stesen / Bilik — satu set PlayStation + TV yang disewakan.",
          "Pakej — harga tetap untuk tempoh tertentu (cth. 3 jam Rp45.000).",
          "Tambah Masa — menambah masa main pada sesi yang sedang berjalan.",
          "DP (wang pendahuluan) — bayaran separuh di awal.",
          "Tempahan / Reservasi — menempah unit untuk masa tertentu. Senarai Menunggu = giliran apabila masa bertembung. No-show = pelanggan tidak datang.",
          "F&B — makanan & minuman.",
          "KDS / Paparan Dapur — skrin pesanan di dapur.",
          "Bayaran pecah (split payment) — satu bil dibayar dengan lebih daripada satu kaedah.",
          "Void — membatalkan transaksi yang tersilap. Refund — memulangkan wang kepada pelanggan.",
        ],
      },
      {
        title: "Juruwang & syif",
        steps: [
          "Syif — tempoh seorang juruwang bertanggungjawab ke atas laci tunai.",
          "Tunai awal — wang tunai dalam laci semasa syif dibuka.",
          "Tunai dijangka — wang tunai yang sepatutnya ada dalam laci mengikut rekod transaksi.",
          "Perbezaan — kiraan fizikal tolak tunai dijangka. Negatif = tunai kurang.",
          "Setoran tunai — tunai laci yang diserahkan kepada pemilik/peti besi/bank.",
          "Pindahan tunai — memindahkan wang antara lokasi tunai.",
          "Baki dijejak — baki e-wallet/deposit yang disemak setiap kali tutup syif.",
        ],
      },
      {
        title: "Stok",
        steps: [
          "SKU — kod unik sesuatu produk.",
          "Harga Kos / Kos Jualan — kos untuk mendapatkan satu produk yang terjual.",
          "Resepi / BOM — senarai bahan untuk satu menu.",
          "PO (Pesanan Belian) — pesanan kepada pembekal.",
          "Stock opname — mengira stok fizikal dan menyamakannya dengan sistem.",
          "Waste — barang rosak/dibuang.",
          "Purata berwajaran / FIFO — cara mengira harga kos apabila harga beli berubah.",
        ],
      },
      {
        title: "Kewangan & perakaunan",
        steps: [
          "Jurnal — catatan simpan kira setiap transaksi (debit dan kredit).",
          "COA (Carta Akaun) — senarai akaun simpan kira, cth. Tunai, Pendapatan Sewa, Belanja Elektrik.",
          "Belum Terima (AR) — wang yang masih terhutang oleh pelanggan kepada outlet.",
          "Belum Bayar (AP) — wang yang masih terhutang oleh outlet kepada pembekal.",
          "Penyata Untung Rugi — pendapatan tolak kos dalam satu tempoh.",
          "Kunci Kira-kira — kedudukan harta, liabiliti, dan modal pada satu tarikh.",
          "Aliran Tunai — wang yang benar-benar masuk dan keluar.",
          "Baki awal — kedudukan kewangan semasa mula menggunakan NEXBILL.",
          "Tutup tempoh — mengunci sesuatu bulan supaya laporannya tidak berubah lagi.",
          "Titik pulang modal / sasaran jualan — pendapatan minimum supaya perniagaan tidak rugi.",
          "Pusat kos — kumpulan kos mengikut bahagian perniagaan.",
        ],
      },
      {
        title: "Aset",
        steps: [
          "Aset tetap — barang modal yang digunakan lebih daripada setahun (PS, TV, kerusi).",
          "Kos perolehan — harga beli aset termasuk penghantaran/pemasangan.",
          "Hayat berguna — anggaran tempoh aset digunakan (bulan).",
          "Nilai sisa — anggaran harga jual aset apabila hayat bergunanya tamat.",
          "Susut nilai — pengurangan nilai aset setiap bulan akibat penggunaan.",
          "Nilai buku — kos perolehan tolak jumlah susut nilai.",
          "Pelupusan — aset dijual, rosak teruk, atau hilang.",
        ],
      },
      {
        title: "Peranti & sistem",
        steps: [
          "NexbillAgent — aplikasi kecil di PC juruwang yang mengawal Android TV.",
          "Palam pintar — soket pintar yang menghidupkan/mematikan kuasa TV dari jauh.",
          "Relay Agent / token — penghubung dan kunci rahsia antara NEXBILL dan NexbillAgent.",
          "TV Screensaver — paparan promosi di Android TV semasa unit tidak digunakan.",
          "Drift — analog alat kawalan bergerak sendiri tanpa disentuh.",
          "Superuser — akaun tertinggi, boleh mengatur semuanya termasuk kebenaran peranan.",
          "Feature Management — tempat menghidupkan/mematikan modul tambahan.",
        ],
      },
    ],
  },
];
