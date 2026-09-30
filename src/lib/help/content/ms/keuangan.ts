import type { HelpCategory } from "../../types";

export const KEUANGAN: HelpCategory[] = [
  {
    id: "accounting",
    group: "keuangan",
    label: "Perakaunan (Simpan Kira & Penyata Kewangan)",
    summary:
      "Simpan kira lengkap yang terisi automatik daripada semua transaksi: carta akaun, jurnal, akaun belum terima & belum bayar, Penyata Untung Rugi, Kunci Kira-kira, Aliran Tunai, semakan automatik, tutup buku bulanan, dan baki awal. Anda tidak perlu memahami perakaunan untuk membaca laporan utamanya.",
    subsections: [
      {
        title: "Laporan yang paling kerap dibuka",
        steps: [
          "Penyata Untung Rugi: pilih tempoh → lihat jumlah pendapatan, untung kasar, dan untung bersih, beserta pecahan mengikut jenis pendapatan dan belanja. Aktifkan \"Bandingkan Pelbagai Tempoh\" untuk membandingkan 2–4 bulan bersebelahan.",
          "Kunci Kira-kira: kedudukan harta (tunai, akaun bank, stok, aset), liabiliti, dan modal pada satu tarikh. Biarkan tarikh kosong untuk hari ini.",
          "Aliran Tunai: wang yang benar-benar masuk dan keluar dalam tempoh itu, mengikut kategori dan mengikut hari.",
          "Semua laporan boleh dimuat turun ke Excel/PDF dan setiap angka boleh diklik untuk melihat transaksi di sebaliknya.",
        ],
      },
      {
        title: "Belum Terima (AR) & Belum Bayar (AP)",
        steps: [
          "Belum Terima: bil pelanggan yang belum lunas, dikumpulkan mengikut tempoh (belum matang, 1–30, 31–60, >60 hari). Tekan \"Terima Bayaran\" apabila pelanggan melunaskan.",
          "Belum Bayar: bil pembekal, perbelanjaan yang direkod sebagai hutang, dan hutang belian aset. Tekan Bayar, pilih akaun tunai/bank.",
        ],
      },
      {
        title: "Carta Akaun & Pemetaan Akaun",
        steps: [
          "Senarai akaun sudah disediakan secara automatik. Tambah akaun baharu hanya jika perlu (kod, nama, jenis, akaun induk).",
          "Akaun yang pernah digunakan tidak boleh dipadam — automatik diarkibkan supaya sejarah tetap betul.",
          "Pemetaan Akaun menentukan akaun sasaran automatik bagi setiap jenis transaksi (cth. sewa PS5 → Pendapatan Sewa). Ubah hanya jika anda memahami perakaunan.",
        ],
      },
      {
        title: "Jurnal & Imbangan Duga",
        steps: [
          "Jurnal: semua catatan simpan kira, boleh ditapis mengikut sumbernya (Sewa, POS, Perbelanjaan, Aset, dll.).",
          "Jurnal Manual (khas pemegang kebenaran): isi tarikh, keterangan, dan baris debit/kredit — jumlah debit mesti sama dengan kredit.",
          "Membatalkan jurnal manual membuat jurnal pembalikan; jurnal asal tidak dipadam. Jurnal automatik dibatalkan melalui menu asalnya (cth. refund di Transaksi).",
          "Imbangan Duga: baki setiap akaun dalam tempoh itu. Untuk baki sejak awal, pilih Custom dan kosongkan kedua-dua tarikh. Mesti sentiasa \"Balance\".",
        ],
      },
      {
        title: "Penyesuaian, Audit, Nota Penyata",
        steps: [
          "Penyesuaian: membandingkan transaksi (tarikh transaksi) dengan jurnal (tarikh catatan) dan menunjukkan pesanan yang tarikhnya berbeza atau bermasalah, beserta panduan penyelesaian — tanpa perlu edit manual.",
          "Audit: semakan simpan kira automatik (cth. produk tanpa harga kos, jurnal berganda, data antara outlet). Pembetulan yang dicadangkan sentiasa melalui pengesahan dan direkod sebagai jurnal pembetulan.",
          "Nota Penyata (SAK EMKM): Nota kepada Penyata Kewangan untuk perniagaan kecil, sedia dilengkapkan dan dicetak.",
        ],
      },
      {
        title: "Tutup Tempoh (kunci bulan)",
        steps: [
          "Selepas laporan sesuatu bulan muktamad, pilih bulan itu dan tekan Tutup Tempoh (catatan pilihan).",
          "Selepas ditutup, tiada jurnal baharu — automatik mahupun manual — boleh direkod dengan tarikh dalam bulan itu, supaya laporan yang sudah diserahkan tidak berubah lagi.",
          "Pembetulan selepas tempoh ditutup direkod dengan tarikh hari ini. Buka semula tempoh hanya jika benar-benar perlu.",
        ],
      },
      {
        title: "Migrasi Data (baki awal & data lama)",
        navHint: "Tab ini hanya kelihatan untuk Owner/Superuser.",
        steps: [
          "Baki Awal: rekod baki pembukaan semua akaun (tunai, akaun bank, belum terima, belum bayar, aset, modal) pada tarikh mula menggunakan NEXBILL. Tekan \"Muat Semua Akaun Postable\" untuk mengisi senarai akaun. Hanya boleh ada satu Baki Awal aktif.",
          "Import Data Sejarah: muat turun templat (Jualan, Belian, Pendapatan Lain, Perbelanjaan), isi, muat naik — supaya trend laporan bulan-bulan sebelumnya turut kelihatan.",
          "Aset yang sudah dimiliki lebih mudah dimasukkan melalui Aset Tetap → Muat Naik Excel dengan pilihan Baki awal.",
        ],
        notes: ["Data sejarah yang diimport masuk ke simpan kira dan laporan, tetapi tidak muncul dalam senarai Transaksi/Perbelanjaan."],
      },
    ],
    notes: [
      "Semua staf boleh MELIHAT halaman ini. Mengubah carta akaun & pemetaan: Owner, Superuser, Accountant. Jurnal manual & baki awal: Owner, Superuser, Accountant. Manager hanya melihat.",
      "Isi Harga Kos setiap produk — tanpanya Penyata Untung Rugi terlalu tinggi. Halaman Penyata Untung Rugi memberi amaran jika ada jualan dengan harga kos kosong.",
    ],
  },
  {
    id: "expenses",
    group: "keuangan",
    label: "Pengurusan Perbelanjaan",
    summary:
      "Rekod semua perbelanjaan outlet (elektrik, gaji, sewa, bahan, letak kereta, dll.) beserta buktinya. Perbelanjaan kecil diluluskan automatik; yang besar menunggu kelulusan Owner/Manager. Semuanya masuk simpan kira secara automatik.",
    subsections: [
      {
        title: "Merekod perbelanjaan",
        steps: [
          "Tekan \"+ Perbelanjaan Baharu\": pilih akaun belanja (cth. Belanja Elektrik), kategori, keterangan, penerima/pembekal (pilihan), kuantiti dan jumlah, cukai (pilihan).",
          "Pilih cara bayar: akaun tunai/bank yang digunakan, atau tandakan \"Rekod sebagai hutang\" dan isi tarikh matangnya.",
          "Lampirkan foto nota/resit sebagai bukti.",
          "Tekan Simpan & Hantar. Di bawah had kelulusan (lalai Rp500.000) terus diluluskan; di atasnya berstatus Menunggu Kelulusan.",
          "Butang simpan dikunci semasa diproses, jadi klik dua kali tidak membuat perbelanjaan berganda.",
        ],
      },
      {
        title: "Kelulusan, pembayaran, pembatalan",
        steps: [
          "Owner/Manager menekan Luluskan atau Tolak (dengan sebab) pada perbelanjaan yang menunggu.",
          "Perbelanjaan yang direkod sebagai hutang, selepas diluluskan, mempunyai butang Bayar untuk melunaskannya.",
          "Draf/menunggu boleh dibatalkan tanpa kesan. Yang sudah diluluskan/dibayar dibatalkan melalui Void (wajib sebab) — simpan kiranya diterbalikkan, datanya tidak dipadam.",
        ],
      },
      {
        title: "Tunai Keluar Pantas",
        steps: ["Borang ringkas 3 ruangan (kategori, jumlah, catatan) untuk perbelanjaan kecil harian dari laci, seperti letak kereta dan air galon. Tetap mengikut had kelulusan."],
      },
      {
        title: "Berulang (perbelanjaan rutin)",
        steps: [
          "Buat templat untuk kos yang berulang: nama, akaun, jumlah, kekerapan (bulanan/mingguan/tahunan), tarikh matang seterusnya.",
          "Tekan \"Jana Perbelanjaan yang Matang\" untuk membuat draf perbelanjaan yang sudah tiba masanya, kemudian Hantar seperti biasa.",
        ],
      },
      {
        title: "Pusat Kos & Dashboard",
        steps: [
          "Pusat Kos membahagikan kos mengikut bahagian (Sewa, F&B, Dapur, Pentadbiran) supaya kelihatan bahagian mana yang paling boros.",
          "Tab Dashboard: perbelanjaan hari ini/bulan ini, yang belum dibayar, menunggu kelulusan, matang ≤3 hari, pecahan mengikut kategori, dan trend 30 hari.",
        ],
      },
    ],
    roles: "Merekod & membayar: Owner, Superuser, Manager, Accountant, Cashier. Meluluskan: Owner, Superuser, Manager. Void: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "other-income",
    group: "keuangan",
    label: "Pendapatan Lain",
    summary:
      "Rekod wang masuk di luar jualan sewa, juruwang, dan PPOB — contohnya komisen, sewa tempat untuk kejohanan, tajaan, jualan barang terpakai, denda daripada pelanggan, faedah atau pulangan tunai bank.",
    steps: [
      "Pilih julat tarikh (atau tekan Hari Ini / Bulan Ini) untuk melihat senarainya.",
      "Isi kategori, keterangan, diterima daripada (pilihan), jumlah, dan kaedah pembayaran, kemudian tekan Simpan.",
      "Terus direkod dalam simpan kira tanpa kelulusan. Jika tunai dan ada syif dibuka, turut masuk kiraan tunai syif.",
      "Tersalah rekod? Tekan Void dan isi sebabnya.",
    ],
    roles: "Merekod/void: Owner, Superuser, Manager, Accountant. Peranan lain dengan kebenaran laporan hanya boleh melihat.",
  },
  {
    id: "payments-methods",
    group: "keuangan",
    label: "Kaedah Pembayaran (QRIS, Pindahan, E-wallet)",
    navHint: "Menu \"Pembayaran\" di bar sisi.",
    summary:
      "Atur pilihan pembayaran yang muncul di juruwang, sewa, Home Rental, dan keahlian — termasuk gambar QRIS dan akaun bank outlet yang ditunjukkan kepada pelanggan.",
    steps: [
      "Tekan \"+ Kaedah\", isi nama (cth. QRIS, Pindahan BCA, GoPay), dan pilih jenisnya:",
      "\"Baki Dijejak\" — untuk e-wallet/baki yang perlu disemak dalam aplikasinya semasa tutup syif. \"Maklumat Sahaja\" — untuk yang terus masuk akaun bank/EDC tanpa perlu disemak setiap syif.",
      "Muat naik gambar QRIS statik outlet dan/atau isi nombor & nama akaun bank. Apabila juruwang memilih kaedah ini, pelanggan terus melihat ke mana perlu membayar.",
      "Edit untuk mengubah nama/jenis/status aktif. Padam hanya menyembunyikan kaedah daripada transaksi baharu; transaksi lama tidak berubah.",
    ],
    notes: [
      "Wang pelanggan sentiasa masuk terus ke akaun/QRIS outlet — tidak pernah melalui NEXBILL.",
      "Kaedah Tunai tidak boleh dipadam kerana digunakan untuk kiraan tunai syif.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "reports",
    group: "keuangan",
    label: "Laporan (Operasi & Kesihatan Kewangan)",
    summary:
      "Laporan operasi mengikut julat tarikh yang mudah dibaca: jualan, sewa, Home Rental, stok & harga kos, pelanggan, perbelanjaan, dan skor kesihatan kewangan. Penyata kewangan rasmi (Untung Rugi, Kunci Kira-kira, Aliran Tunai) ada di menu Perakaunan.",
    subsections: [
      { title: "Jualan", steps: ["Jumlah pendapatan (sewa vs juruwang), bilangan transaksi lunas, trend harian, pendapatan mengikut kaedah pembayaran, jumlah diskaun/cukai/caj perkhidmatan. Ada perbandingan dengan Penyata Untung Rugi bagi tempoh yang sama."] },
      { title: "Sewa", steps: ["Pendapatan sewa, bilangan sesi, purata tempoh main, dan jadual mengikut unit PS (sesi, purata tempoh, pendapatan)."] },
      { title: "Home Rental", steps: ["Pendapatan sewa bawa pulang, denda, ganti rugi, pecahan mengikut kategori dan jenis produk, serta status deposit."] },
      { title: "Inventori & Kos Jualan", steps: ["Pendapatan produk, jumlah harga kos, margin setiap produk, senarai barang rosak/terbuang, dan stok hampir habis."] },
      { title: "Pelanggan", steps: ["Bilangan pelanggan, taburan tahap keahlian, dan pelanggan dengan belian terbesar."] },
      { title: "Belanja", steps: ["Jumlah perbelanjaan vs pendapatan, nisbah perbelanjaan, untung bersih, trend, dan pecahan mengikut kategori/akaun/pembekal/kaedah/cawangan/pusat kos."] },
      {
        title: "Kesihatan Kewangan",
        steps: [
          "Ringkasan sihat atau tidaknya perniagaan dalam bahasa mudah: Keberuntungan (sejauh mana untung), Kecairan (cukup wang tunai untuk membayar kewajipan), dan Kecekapan Operasi (kos berbanding pendapatan).",
          "Gunakan setiap hujung bulan bersama Penyata Untung Rugi.",
        ],
      },
    ],
    notes: [
      "Setiap tab mempunyai pilihan tarikh sendiri.",
      "Muat turun Excel/PDF untuk penyata kewangan rasmi tersedia di menu Perakaunan.",
    ],
  },
];
