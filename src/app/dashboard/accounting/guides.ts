/**
 * Panduan per tab halaman Accounting — ditulis untuk pemilik/kasir outlet yang BUKAN akuntan.
 * Setiap tab punya: ringkasan satu kalimat, konsep akuntansinya, kegunaan, hal yang harus
 * diperhatikan, dan langkah kerja. Ditampilkan oleh TabGuide.tsx di atas isi tab.
 *
 * Kode akun yang disebut di sini adalah kode bawaan (lib/accounting/coa-data.ts) — outlet bisa
 * memindahkannya lewat Account Mapping, jadi teksnya selalu menyebut "bawaan".
 */

export interface TabGuideContent {
  summary: string;
  concept: string[];
  uses: string[];
  watch: string[];
  steps: string[];
}

export const ACCOUNTING_TAB_GUIDES: Record<string, TabGuideContent> = {
  "Chart of Accounts": {
    summary: "Daftar semua \"laci\" pencatatan keuangan outlet (akun). Setiap rupiah yang masuk/keluar selalu dicatat ke salah satu akun di sini.",
    concept: [
      "Chart of Accounts (CoA / Bagan Akun) adalah daftar akun yang dikelompokkan menjadi 5 golongan: 1 Aset (yang dimiliki), 2 Liabilitas (utang/kewajiban), 3 Ekuitas (modal pemilik), 4 Pendapatan, 5–8 Beban (HPP dan biaya operasional).",
      "Akun induk (header, dicetak tebal) hanya menjumlahkan akun di bawahnya dan tidak bisa menerima jurnal. Transaksi selalu masuk ke akun turunan (posting account).",
      "Saldo normal: Aset dan Beban bertambah di sisi Debit; Liabilitas, Ekuitas, dan Pendapatan bertambah di sisi Kredit.",
    ],
    uses: [
      "Menentukan pos-pos yang muncul di Neraca dan Laba Rugi.",
      "Menambah akun khusus sesuai usaha Anda, misalnya rekening bank kedua, akun e-wallet baru, atau jenis biaya tertentu.",
    ],
    watch: [
      "Jangan menghapus atau mengganti golongan akun yang sudah punya transaksi — laporan periode lalu ikut berubah. Kalau tidak dipakai lagi, nonaktifkan saja.",
      "Kode akun mengikuti golongan: akun bank harus diawali 112x, e-wallet 113x, beban diawali 6xxx. Kode yang salah golongan membuat akun muncul di bagian laporan yang keliru.",
      "Setiap outlet punya CoA sendiri. Akun satu outlet tidak bisa dipakai outlet lain.",
    ],
    steps: [
      "Awal memakai NEXBILL: periksa daftar akun bawaan, tambahkan rekening bank/e-wallet yang benar-benar Anda pakai.",
      "Tambah akun baru hanya bila tidak ada akun bawaan yang cocok — pilih induk yang tepat supaya masuk golongan laporan yang benar.",
      "Setelah menambah akun kas/bank/e-wallet, hubungkan di tab Account Mapping (modul Payment) agar transaksi otomatis masuk ke sana.",
    ],
  },

  "Account Mapping": {
    summary: "Aturan otomatis \"transaksi jenis X dicatat ke akun Y\". Kasir tidak pernah memilih akun — sistem mengikuti tabel ini.",
    concept: [
      "Setiap modul (Rental, F&B, Produk, PPOB, Expense, Aset, Pembayaran, dll.) mencari akun tujuannya di tabel ini berdasarkan modul + jenis transaksi.",
      "Contoh: modul Payment kunci \"qris\" → akun 1131 QRIS (bawaan), sehingga setiap pembayaran QRIS menambah saldo akun QRIS, bukan Kas.",
      "Kalau sebuah baris tidak ada, sistem memakai akun bawaan. Jadi tabel ini dipakai untuk MENYESUAIKAN, bukan wajib diisi dari nol.",
    ],
    uses: [
      "Memisahkan pendapatan per jenis konsol/produk supaya Laba Rugi lebih rinci.",
      "Menentukan ke rekening mana uang dari setiap metode pembayaran masuk — dasar rekonsiliasi saldo per channel saat tutup shift.",
      "Mengarahkan HPP, penyusutan, persediaan, dan utang pembelian aset ke akun yang Anda inginkan.",
    ],
    watch: [
      "Jenis akun harus sesuai fungsinya: pendapatan → akun pendapatan, pembayaran → akun kas/bank, HPP/beban → akun beban. Tab Audit memeriksa ini otomatis.",
      "Kolom kunci (transaction key) adalah kata yang dicari sistem — jangan diubah. Mengubah kuncinya membuat baris berhenti dipakai tanpa pesan error.",
      "Perubahan mapping hanya berlaku untuk transaksi BARU. Transaksi lama tetap di akun lamanya; pindahkan dengan jurnal manual bila perlu.",
      "Metode pembayaran kustom yang belum di-mapping akan masuk ke akun Bank umum (1121) — tab Audit akan memberi peringatan.",
    ],
    steps: [
      "Setelah menambah metode pembayaran baru (mis. e-wallet lain), tambahkan baris modul Payment untuk metode itu ke akun e-wallet yang sesuai.",
      "Ubah akun tujuan lewat tombol edit, lalu cek beberapa transaksi berikutnya di tab Jurnal untuk memastikan akunnya sudah benar.",
      "Jalankan tab Audit → \"Account Mapping\" setelah mengubah apa pun di sini.",
    ],
  },

  Jurnal: {
    summary: "Buku harian semua transaksi dalam bentuk debit–kredit. Hampir semua jurnal dibuat otomatis oleh sistem.",
    concept: [
      "Setiap transaksi dicatat dengan prinsip berpasangan (double entry): total Debit selalu sama dengan total Kredit. Contoh sewa PS dibayar tunai Rp50.000: Debit Kas Kasir Rp50.000, Kredit Pendapatan Rental Rp50.000.",
      "Kolom Sumber menunjukkan asal jurnal (Rental, POS, Expense, Pembelian Aset, Penyusutan, Manual, dst.).",
      "Transaksi yang dibatalkan TIDAK dihapus: sistem membuat jurnal pembalik (kebalikan debit/kredit) sehingga saldonya kembali nol dan jejak auditnya tetap ada.",
    ],
    uses: [
      "Menelusuri asal-usul sebuah angka di laporan.",
      "Mencatat transaksi yang tidak punya menu sendiri lewat Jurnal Manual: setoran modal pemilik, prive (pengambilan pribadi), koreksi salah catat, bunga/biaya admin bank, pelunasan utang lama.",
    ],
    watch: [
      "Jangan mencatat ulang lewat jurnal manual transaksi yang sudah dicatat modulnya (penjualan, expense, belanja supplier, pembelian aset) — hasilnya menjadi ganda.",
      "Jurnal manual wajib seimbang dan akunnya harus akun turunan, bukan akun induk.",
      "Periode yang sudah ditutup tidak bisa menerima jurnal bertanggal di dalamnya — catat koreksi dengan tanggal hari ini.",
      "Memakai akun Kas pada jurnal manual mengubah saldo kas; pastikan uangnya memang benar-benar bergerak.",
    ],
    steps: [
      "Untuk memeriksa: filter periode, cari berdasarkan referensi/deskripsi, buka detail baris untuk melihat akun debit–kreditnya.",
      "Untuk koreksi: buat jurnal manual yang membalik bagian yang salah lalu mencatat yang benar, dengan deskripsi jelas (\"Koreksi salah akun expense tgl …\").",
      "Setoran modal: Debit Kas/Bank, Kredit 3110 Modal Pemilik. Prive: Debit 3130 Prive, Kredit Kas/Bank.",
    ],
  },

  "Neraca Saldo": {
    summary: "Daftar saldo semua akun pada satu periode. Alat kontrol utama: total Debit harus sama dengan total Kredit.",
    concept: [
      "Neraca Saldo (Trial Balance) merangkum jurnal per akun: berapa bertambah (debit), berapa berkurang (kredit), dan sisanya (saldo).",
      "Kalau total Debit = total Kredit, pencatatan seimbang. Seimbang belum tentu benar (akun bisa salah pilih), tapi tidak seimbang pasti ada masalah.",
      "Pasangan transaksi batal + pembaliknya yang sama-sama di dalam periode disembunyikan karena saling meniadakan.",
    ],
    uses: [
      "Titik awal memeriksa kesehatan pembukuan sebelum melihat Laba Rugi dan Neraca.",
      "Mencocokkan saldo akun dengan kenyataan: saldo Kas Kasir dengan uang di laci, saldo Bank dengan mutasi rekening, saldo QRIS dengan dashboard penyedia QRIS.",
    ],
    watch: [
      "Saldo tidak wajar (ditandai): Aset bernilai minus atau Liabilitas bersaldo debit. Biasanya ada transaksi dunia nyata yang belum dicatat (setoran, top-up, pelunasan).",
      "Angka besar di kolom Debit/Kredit adalah pergerakan, bukan sisa. Lihat kolom saldo untuk nilai akhirnya.",
      "Saldo Piutang padahal semua pelanggan sudah bayar lunas → cek tab Piutang dan Audit.",
    ],
    steps: [
      "Setiap hari/minggu: cocokkan saldo Kas Kasir, Bank, dan e-wallet dengan uang/saldo sebenarnya.",
      "Klik akun mana pun untuk melihat jurnal penyusunnya (buku besar). Aktifkan \"tampilkan transaksi dibatalkan\" hanya untuk keperluan audit.",
      "Selisih yang tidak bisa dijelaskan → jalankan tab Audit.",
    ],
  },

  "Piutang (AR)": {
    summary: "Tagihan kepada pelanggan yang belum dibayar lunas — uang yang masih menjadi hak outlet.",
    concept: [
      "Piutang (Accounts Receivable) muncul otomatis saat order/rental ditutup tapi pembayarannya kurang. Sisanya dicatat ke akun 1141 Piutang Pelanggan (bawaan).",
      "Saat pelanggan melunasi, piutang berkurang dan Kas/Bank/e-wallet bertambah — tidak menambah pendapatan lagi, karena pendapatannya sudah diakui saat order.",
      "Umur piutang (aging) dikelompokkan: belum jatuh tempo, 1–30, 31–60, dan lebih dari 60 hari.",
    ],
    uses: [
      "Menagih pelanggan yang belum lunas dan memantau berapa lama tagihannya menggantung.",
      "Menerima pelunasan langsung dari tab ini dengan metode pembayaran yang dipakai pelanggan.",
    ],
    watch: [
      "Piutang lebih dari 60 hari berisiko tidak tertagih. Prinsip kehati-hatian: pertimbangkan penghapusan (jurnal manual ke beban piutang tak tertagih) bila jelas tidak akan dibayar.",
      "Jangan menerima pelunasan di menu lain lalu juga di sini — pilih satu tempat supaya tidak tercatat dua kali.",
      "Piutang \"transaksi asal sudah tidak ada\" tidak bisa dibayar lewat tombol; selesaikan dengan jurnal manual.",
    ],
    steps: [
      "Cek tab ini setiap hari sebelum tutup shift.",
      "Klik Terima Bayar → isi nominal (boleh sebagian) → pilih metode → simpan. Uang masuk ke akun sesuai Account Mapping metode tersebut.",
      "Bulanan: tinjau aging; tagih yang lebih dari 30 hari, putuskan penghapusan untuk yang tidak tertagih.",
    ],
  },

  "Hutang (AP)": {
    summary: "Semua kewajiban outlet yang belum dibayar: ke supplier, pembelian aset, dan biaya yang dicatat sebagai utang.",
    concept: [
      "Utang (Accounts Payable) tercipta saat Anda menerima barang/jasa tapi membayarnya nanti: Belanja Supplier tempo (2111 Utang Supplier), Pembelian Aset dengan DP/tempo (Utang Pembelian Aset, bawaan 2163), dan Expense yang dicatat sebagai utang.",
      "Membayar utang tidak menambah beban lagi — bebannya/asetnya sudah dicatat saat transaksi awal. Pembayaran hanya mengurangi utang dan Kas/Bank.",
    ],
    uses: [
      "Melihat semua tagihan yang harus dibayar di satu tempat beserta umurnya.",
      "Membayar (lunas atau cicil) langsung dari sini.",
    ],
    watch: [
      "Utang yang lewat jatuh tempo mengganggu hubungan dengan supplier — pantau kolom umur.",
      "Bayar lewat tab ini atau menu asalnya, jangan ditambah jurnal manual — hasilnya ganda.",
      "Pilih akun kas/bank yang benar-benar mengeluarkan uang. Jika dari laci kasir, pembayaran ikut mengurangi ekspektasi kas shift.",
    ],
    steps: [
      "Mingguan: urutkan dari yang paling lama, jadwalkan pembayaran.",
      "Klik Bayar → isi nominal (untuk supplier dan aset boleh cicil) → pilih metode dan akun kas/bank → simpan.",
      "Akhir bulan: saldo akun utang di Neraca Saldo harus sama dengan total di tab ini.",
    ],
  },

  "Laba Rugi": {
    summary: "Apakah usaha untung atau rugi dalam satu periode: Pendapatan dikurangi HPP dan Beban.",
    concept: [
      "Laba Rugi disusun dengan basis akrual (SAK EMKM): pendapatan diakui saat transaksi terjadi (tanggal bisnis order), bukan saat uang diterima; beban diakui saat terjadi.",
      "Laba Kotor = Pendapatan − HPP (modal barang yang terjual). Laba Bersih = Laba Kotor − Beban Operasional (gaji, listrik, sewa, penyusutan, dst.) ± pendapatan/beban lain.",
      "Penyusutan aset adalah beban walau tidak ada uang keluar — mencerminkan nilai PS/TV yang berkurang karena dipakai.",
    ],
    uses: [
      "Menilai kinerja per bulan dan membandingkan antar periode.",
      "Melihat sumber pendapatan terbesar (rental, F&B, produk, PPOB) dan pos biaya terbesar.",
      "Dasar menghitung PPh Final UMKM (0,5% dari peredaran bruto).",
    ],
    watch: [
      "Laba besar tapi kas sedikit itu wajar bila ada piutang, stok bertambah, atau pembelian aset — lihat Arus Kas.",
      "Peringatan \"HPP belum terhitung\" berarti ada produk tanpa Harga Modal; labanya terlihat lebih besar dari sebenarnya.",
      "Tanpa menjalankan penyusutan bulanan, laba terlihat terlalu tinggi.",
      "Beban yang belum dicatat (tagihan listrik/internet bulan ini) membuat laba terlihat lebih besar — catat sebagai expense utang bila belum dibayar.",
    ],
    steps: [
      "Pilih periode (biasanya bulan lalu setelah tutup buku) dan bandingkan dengan periode sebelumnya.",
      "Klik baris mana pun untuk melihat transaksi penyusunnya.",
      "Sebelum membaca laba akhir bulan: pastikan semua expense sudah dicatat, penyusutan sudah dijalankan, dan stok opname sudah dilakukan.",
    ],
  },

  Rekonsiliasi: {
    summary: "Mencocokkan transaksi penjualan (Halaman Transaksi) dengan jurnal pendapatannya, per order.",
    concept: [
      "Setiap order yang lunas seharusnya punya tepat satu jurnal penjualan dengan nilai dan tanggal bisnis yang sama.",
      "Status: Cocok, Menunggu pembayaran, Tanggal beda, Nominal beda, Jurnal hilang, Order batal tapi jurnal masih ada, dan Jurnal tanpa order.",
    ],
    uses: [
      "Memastikan omzet di laporan penjualan sama dengan pendapatan di Laba Rugi.",
      "Memperbaiki jurnal yang terlewat/berbeda dengan tombol Sinkronkan Ulang tanpa input manual.",
    ],
    watch: [
      "Nominal beda atau jurnal hilang berarti Laba Rugi tidak akurat untuk tanggal itu.",
      "Order lewat tengah malam dicatat pada tanggal bisnis (hari dibuka), bukan jam bayar — ini disengaja.",
      "Sinkronkan ulang membatalkan jurnal lama lalu memposting ulang; tidak bisa dilakukan untuk periode yang sudah ditutup.",
    ],
    steps: [
      "Harian (setelah tutup shift): pilih \"hari ini\", pastikan semua baris Cocok atau Menunggu pembayaran.",
      "Baris bermasalah → klik Sinkronkan Ulang, lalu muat ulang untuk memastikan statusnya Cocok.",
      "Lakukan sebelum Tutup Periode setiap bulan.",
    ],
  },

  Neraca: {
    summary: "Posisi keuangan pada satu tanggal: apa yang dimiliki (Aset), apa yang terutang (Liabilitas), dan modal pemilik (Ekuitas).",
    concept: [
      "Rumus dasar yang selalu berlaku: Aset = Liabilitas + Ekuitas. Di SAK EMKM laporan ini disebut Laporan Posisi Keuangan.",
      "Aset tetap (PS, TV, furnitur) disajikan sebesar harga perolehan dikurangi akumulasi penyusutan = nilai buku.",
      "Laba tahun berjalan masuk ke Ekuitas; setelah tutup tahun menjadi Laba Ditahan.",
    ],
    uses: [
      "Mengetahui kekayaan bersih usaha dan kemampuan membayar utang (kas + piutang dibanding utang jangka pendek).",
      "Dokumen yang biasanya diminta bank/leasing untuk pengajuan pinjaman.",
    ],
    watch: [
      "Neraca harus seimbang. Jika tidak, jalankan tab Audit.",
      "Saldo Kas di Neraca harus sama dengan uang sebenarnya; selisih berarti ada transaksi yang belum/salah dicatat.",
      "Persediaan harus sesuai hasil stok opname.",
    ],
    steps: [
      "Pilih tanggal (biasanya akhir bulan) setelah semua transaksi bulan itu lengkap.",
      "Klik baris untuk menelusuri angka yang janggal.",
      "Bandingkan dengan akhir bulan lalu untuk melihat perubahan utang, piutang, dan modal.",
    ],
  },

  "Arus Kas": {
    summary: "Uang yang benar-benar masuk dan keluar dari akun kas dan bank dalam satu periode.",
    concept: [
      "Berbeda dengan Laba Rugi: Arus Kas hanya menghitung uang yang bergerak. Penjualan yang belum dibayar (piutang) tidak masuk; pembelian aset dan pembayaran utang masuk sebagai kas keluar walau bukan beban.",
      "Dihitung langsung dari mutasi akun Kas/Bank di jurnal, sehingga kas bersih selalu sama dengan perubahan saldo akun-akun itu di Neraca Saldo. Akun yang dihitung (kas 111x, bank 112x, dan akun yang terdaftar sebagai kas/bank) tercantum di bawah laporan.",
      "Pindah kas antar-laci/rekening sendiri bernilai nol bersih dan tidak dihitung sebagai arus kas.",
    ],
    uses: [
      "Mengetahui dari mana uang datang dan ke mana uang pergi.",
      "Merencanakan pembayaran besar (supplier, cicilan aset, gaji) berdasarkan pola kas harian.",
    ],
    watch: [
      "Laba besar tapi kas bersih negatif: cek pembelian aset, pelunasan utang, penambahan stok, atau piutang yang menumpuk.",
      "Kas masuk/keluar yang janggal sering berasal dari jurnal manual yang memakai akun Kas — telusuri di Jurnal.",
    ],
    steps: [
      "Mingguan/bulanan: pilih periode, lihat kategori kas keluar terbesar.",
      "Pastikan kas bersih periode = perubahan saldo akun kas/bank di Neraca Saldo periode yang sama.",
    ],
  },

  "CALK (SAK EMKM)": {
    summary: "Catatan atas Laporan Keuangan — komponen ketiga yang diwajibkan SAK EMKM, disusun otomatis.",
    concept: [
      "SAK EMKM (Standar Akuntansi Keuangan Entitas Mikro, Kecil, dan Menengah) mewajibkan tiga laporan: Laporan Posisi Keuangan (Neraca), Laporan Laba Rugi, dan CALK.",
      "CALK menjelaskan identitas usaha, dasar penyusunan (akrual, biaya historis), kebijakan akuntansi (persediaan rata-rata tertimbang atau FIFO sesuai pilihan outlet, penyusutan garis lurus), rincian pos laporan, dan pajak penghasilan.",
    ],
    uses: [
      "Melengkapi laporan keuangan untuk bank, investor, koperasi, atau pelaporan pajak.",
      "Dicetak / disimpan PDF bersama Neraca dan Laba Rugi.",
    ],
    watch: [
      "Data identitas (nama, alamat, NPWP, bentuk badan usaha) diambil dari data outlet di Pengaturan — lengkapi di sana.",
      "Estimasi PPh Final 0,5% bersifat informatif; kewajiban sebenarnya mengikuti status dan fasilitas pajak Anda.",
      "Isi CALK hanya seakurat pembukuannya — jalankan Audit dan pastikan periode sudah lengkap sebelum mencetak.",
    ],
    steps: [
      "Pilih periode laporan (biasanya satu tahun buku, atau bulanan untuk laporan internal).",
      "Periksa rincian aset tetap dan pajak, lalu klik Cetak / Simpan PDF.",
    ],
  },

  Audit: {
    summary: "Pemeriksaan otomatis kesehatan pembukuan berdasarkan prinsip kehati-hatian — cari masalah sebelum masalah itu masuk ke laporan.",
    concept: [
      "Audit memeriksa hal-hal yang tidak terlihat di laporan: jurnal ganda, jurnal tidak seimbang, transaksi batal yang masih berlaku, sumber posting kas yang tidak valid, mapping akun keliru, nilai persediaan, stok minus, HPP kosong, saldo tidak wajar, piutang menua, periode belum ditutup, dan pajak.",
      "Hijau = aman, kuning = perlu diperhatikan, merah = harus diperbaiki.",
      "Perbaikan otomatis selalu berupa jurnal koreksi/pembalik yang tercatat dan masuk log audit — tidak ada data yang dihapus.",
    ],
    uses: [
      "Pemeriksaan rutin sebelum tutup buku bulanan.",
      "Mencari penyebab ketika saldo Kas, Piutang, atau Laba terlihat janggal.",
    ],
    watch: [
      "Baca penjelasan setiap temuan sebelum menekan tombol perbaikan.",
      "Penyesuaian nilai persediaan hanya dilakukan setelah Harga Modal produk dan stok opname benar.",
      "Temuan yang tidak punya perbaikan otomatis perlu ditangani manual (mis. mengisi Harga Modal, meninjau shift).",
    ],
    steps: [
      "Jalankan minimal seminggu sekali dan wajib sebelum Tutup Periode.",
      "Tangani merah dulu, lalu kuning. Jalankan ulang Audit sampai bersih.",
    ],
  },

  "Tutup Periode": {
    summary: "Mengunci bulan yang sudah selesai dilaporkan supaya angkanya tidak berubah lagi.",
    concept: [
      "Setelah periode ditutup, tidak ada jurnal baru (otomatis maupun manual) yang bisa bertanggal di dalam periode itu.",
      "Koreksi setelah tutup dicatat dengan tanggal hari ini (periode berjalan), bukan dengan membuka kembali periode lama.",
    ],
    uses: [
      "Menjaga laporan yang sudah diserahkan ke pemilik/bank/pajak tetap sama.",
      "Mencegah transaksi mundur tanggal (backdate) yang bisa menjadi celah kecurangan.",
    ],
    watch: [
      "Tutup hanya setelah semua transaksi bulan itu lengkap: shift ditutup, expense dicatat, penyusutan dijalankan, stok opname, rekonsiliasi bank.",
      "Membuka kembali periode hanya untuk kasus benar-benar perlu dan hanya oleh Owner — setiap buka/tutup tercatat.",
    ],
    steps: [
      "Checklist akhir bulan (tanggal 1–5 bulan berikutnya): tutup semua shift → catat expense & tagihan → jalankan penyusutan di menu Aset → stok opname → cocokkan saldo bank/e-wallet → Rekonsiliasi → Audit bersih.",
      "Pilih bulan → Tutup Periode.",
      "Cetak Neraca, Laba Rugi, dan CALK bulan itu sebagai arsip.",
    ],
  },

  "Migrasi Data": {
    summary: "Memindahkan pembukuan dari sistem/catatan lama ke NEXBILL.",
    concept: [
      "Cara standar migrasi: satu jurnal Saldo Awal per tanggal cutover yang berisi saldo setiap akun (Kas, Bank, Piutang, Persediaan, Aset, Utang, Modal). Transaksi lama tidak perlu dipindah satu per satu.",
      "Selisih debit–kredit saldo awal ditampung di 3400 Ekuitas Saldo Awal (bawaan).",
      "Impor Data Historis (Excel) hanya untuk kebutuhan laporan periode lalu; data itu tidak muncul di Halaman Transaksi atau stok.",
    ],
    uses: [
      "Memulai NEXBILL tanpa kehilangan saldo dari sistem sebelumnya.",
      "Membandingkan laporan sebelum dan sesudah memakai NEXBILL.",
    ],
    watch: [
      "Saldo awal diinput SEKALI. Menginputnya dua kali menggandakan semua saldo.",
      "Aset tetap yang sudah dimiliki lebih rapi dicatat lewat menu Aset → Pembelian Aset → \"Saldo awal\" supaya ikut penyusutan per unit — jangan dicatat lagi di jurnal saldo awal.",
      "Stok awal produk dicatat lewat Inventory (stok awal), bukan di sini, supaya jumlah unit dan nilainya sinkron.",
    ],
    steps: [
      "Tentukan tanggal cutover (biasanya awal bulan).",
      "Siapkan saldo per akun dari laporan lama per tanggal itu, lalu input di Saldo Awal sampai total debit = kredit.",
      "Opsional: impor data historis melalui template Excel.",
      "Cek Neraca per tanggal cutover — harus sama dengan neraca lama Anda.",
    ],
  },
};

export interface WorkflowStage {
  when: string;
  items: string[];
}

/** Alur kerja akuntansi rutin outlet — ditampilkan di panel "Panduan Alur Kerja". */
export const ACCOUNTING_WORKFLOW: WorkflowStage[] = [
  {
    when: "Sekali di awal",
    items: [
      "Periksa Chart of Accounts; tambahkan rekening bank dan e-wallet yang dipakai.",
      "Atur Account Mapping metode pembayaran ke rekening yang benar.",
      "Input Saldo Awal (tab Migrasi Data), stok awal produk (Inventory), dan aset yang sudah dimiliki (Aset → Pembelian Aset → Saldo awal).",
    ],
  },
  {
    when: "Setiap hari",
    items: [
      "Kasir buka dan tutup shift; hitung uang laci dengan jujur — selisih kas adalah alarm utama.",
      "Catat setiap pengeluaran di menu Expense, belanja stok di Belanja Supplier, pembelian PS/TV/perabot di Aset → Pembelian Aset.",
      "Cek Piutang: tagih yang belum lunas.",
      "Rekonsiliasi hari ini: semua order harus Cocok.",
    ],
  },
  {
    when: "Setiap minggu",
    items: [
      "Cocokkan saldo Bank dan e-wallet/QRIS di Neraca Saldo dengan mutasi rekening/dashboard penyedia.",
      "Bayar utang supplier/aset yang jatuh tempo (tab Hutang).",
      "Jalankan tab Audit dan tangani temuan merah.",
    ],
  },
  {
    when: "Setiap akhir bulan",
    items: [
      "Catat tagihan bulanan (listrik, internet, sewa, gaji) — sebagai utang bila belum dibayar.",
      "Jalankan Penyusutan di menu Aset.",
      "Stok opname di Inventory.",
      "Audit sampai bersih, lalu Tutup Periode.",
      "Baca Laba Rugi, Neraca, dan Arus Kas; simpan PDF sebagai arsip.",
    ],
  },
  {
    when: "Setiap akhir tahun",
    items: [
      "Pastikan 12 bulan sudah ditutup.",
      "Cetak Laporan Posisi Keuangan, Laba Rugi, dan CALK (SAK EMKM) tahunan.",
      "Hitung dan setor PPh Final UMKM (0,5% peredaran bruto bila masih memenuhi syarat), lalu catat pembayarannya.",
    ],
  },
];

export const GOLDEN_RULES: string[] = [
  "Satu transaksi dicatat satu kali, di menunya sendiri. Jurnal manual hanya untuk yang tidak punya menu.",
  "Jangan menghapus — batalkan. Pembatalan membuat jurnal pembalik sehingga jejaknya tetap bisa diaudit.",
  "Uang pribadi dan uang usaha dipisah. Pengambilan pribadi dicatat sebagai Prive, bukan expense.",
  "Setiap selisih (kas laci, saldo bank, stok) harus dijelaskan, bukan dibiarkan.",
  "Laporan hanya seakurat input: harga modal produk, penyusutan, dan expense yang lengkap menentukan laba yang benar.",
];
