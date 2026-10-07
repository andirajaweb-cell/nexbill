import type { AccountingGuideBook } from "./guides";

/** Terjemahan Bahasa Malaysia untuk guides.ts — tab dan bilangan butir setiap bahagian sama. */
export const ACCOUNTING_GUIDE_BOOK_MS: AccountingGuideBook = {
  tabs: {
    "Chart of Accounts": {
      summary: "Senarai semua \"laci\" pencatatan kewangan outlet (akaun). Setiap ringgit/rupiah yang masuk atau keluar sentiasa direkodkan ke salah satu akaun di sini.",
      concept: [
        "Carta Akaun (CoA) ialah senarai akaun yang dikumpulkan kepada 5 golongan: 1 Aset (yang dimiliki), 2 Liabiliti (hutang/obligasi), 3 Ekuiti (modal pemilik), 4 Hasil, 5–8 Perbelanjaan (kos jualan dan kos operasi).",
        "Akaun induk (pengepala, dicetak tebal) hanya menjumlahkan akaun di bawahnya dan tidak boleh menerima jurnal. Transaksi sentiasa masuk ke akaun anak (akaun posting).",
        "Baki normal: Aset dan Perbelanjaan bertambah di sebelah Debit; Liabiliti, Ekuiti, dan Hasil bertambah di sebelah Kredit.",
      ],
      uses: [
        "Menentukan butiran yang muncul dalam Kunci Kira-kira dan Penyata Untung Rugi.",
        "Menambah akaun khusus mengikut perniagaan anda, contohnya akaun bank kedua, akaun e-dompet baharu, atau jenis perbelanjaan tertentu.",
      ],
      watch: [
        "Jangan padam atau tukar golongan akaun yang sudah ada transaksi — laporan tempoh lalu turut berubah. Jika tidak digunakan lagi, nyahaktifkan sahaja.",
        "Kod akaun mengikut golongan: akaun bank mesti bermula dengan 112x, e-dompet 113x, perbelanjaan 6xxx. Kod dalam golongan yang salah membuatkan akaun muncul di bahagian laporan yang salah.",
        "Setiap outlet ada CoA sendiri. Akaun satu outlet tidak boleh digunakan oleh outlet lain.",
      ],
      steps: [
        "Semasa mula menggunakan NEXBILL: semak senarai akaun lalai, tambah akaun bank/e-dompet yang benar-benar anda gunakan.",
        "Tambah akaun baharu hanya jika tiada akaun lalai yang sesuai — pilih induk yang tepat supaya masuk golongan laporan yang betul.",
        "Selepas menambah akaun tunai/bank/e-dompet, hubungkan dalam tab Pemetaan Akaun (modul Payment) supaya transaksi masuk ke sana secara automatik.",
      ],
    },

    "Account Mapping": {
      summary: "Peraturan automatik \"transaksi jenis X direkodkan ke akaun Y\". Juruwang tidak pernah memilih akaun — sistem mengikut jadual ini.",
      concept: [
        "Setiap modul (Sewa, F&B, Produk, PPOB, Perbelanjaan, Aset, Pembayaran, dll.) mencari akaun sasarannya dalam jadual ini berdasarkan modul + jenis transaksi.",
        "Contoh: modul Payment kunci \"qris\" → akaun 1131 QRIS (lalai), jadi setiap pembayaran QRIS menambah baki akaun QRIS, bukan Tunai.",
        "Jika sesuatu baris tiada, sistem menggunakan akaun lalai. Jadi jadual ini digunakan untuk MENYESUAIKAN, bukan wajib diisi dari kosong.",
      ],
      uses: [
        "Mengasingkan hasil mengikut jenis konsol/produk supaya Penyata Untung Rugi lebih terperinci.",
        "Menentukan ke akaun mana wang daripada setiap kaedah pembayaran masuk — asas penyesuaian baki setiap saluran semasa tutup syif.",
        "Mengarahkan kos jualan, susut nilai, inventori, dan hutang belian aset ke akaun yang anda mahu.",
      ],
      watch: [
        "Jenis akaun mesti sesuai dengan fungsinya: hasil → akaun hasil, pembayaran → akaun tunai/bank, kos jualan/perbelanjaan → akaun perbelanjaan. Tab Audit menyemak ini secara automatik.",
        "Lajur kunci (transaction key) ialah perkataan yang dicari sistem — jangan ubah. Mengubah kunci membuatkan baris berhenti digunakan tanpa mesej ralat.",
        "Perubahan pemetaan hanya berlaku untuk transaksi BAHARU. Transaksi lama kekal dalam akaun lamanya; pindahkan dengan jurnal manual jika perlu.",
        "Kaedah pembayaran tersuai yang belum dipetakan akan masuk ke akaun Bank umum (1121) — tab Audit akan memberi amaran.",
      ],
      steps: [
        "Selepas menambah kaedah pembayaran baharu (cth. e-dompet lain), tambah baris modul Payment untuk kaedah itu ke akaun e-dompet yang sesuai.",
        "Tukar akaun sasaran melalui butang edit, kemudian semak beberapa transaksi seterusnya dalam tab Jurnal untuk memastikan akaunnya betul.",
        "Jalankan tab Audit → \"Account Mapping\" selepas mengubah apa-apa di sini.",
      ],
    },

    Jurnal: {
      summary: "Buku harian semua transaksi dalam bentuk debit–kredit. Hampir semua jurnal dibuat secara automatik oleh sistem.",
      concept: [
        "Setiap transaksi direkodkan dengan prinsip catatan bergu (double entry): jumlah Debit sentiasa sama dengan jumlah Kredit. Contoh sewa PS dibayar tunai Rp50.000: Debit Tunai Juruwang Rp50.000, Kredit Hasil Sewa Rp50.000.",
        "Lajur Sumber menunjukkan asal jurnal (Sewa, POS, Perbelanjaan, Belian Aset, Susut Nilai, Manual, dsb.).",
        "Transaksi yang dibatalkan TIDAK dipadam: sistem membuat jurnal pembalikan (debit/kredit diterbalikkan) supaya bakinya kembali sifar dan jejak auditnya kekal.",
      ],
      uses: [
        "Menjejak asal-usul sesuatu angka dalam laporan.",
        "Merekod transaksi yang tiada menu sendiri melalui Jurnal Manual: sumbangan modal pemilik, ambilan pemilik, pembetulan salah catat, faedah/caj pentadbiran bank, penjelasan hutang lama.",
      ],
      watch: [
        "Jangan rekod semula melalui jurnal manual transaksi yang sudah direkodkan oleh modulnya (jualan, perbelanjaan, belian pembekal, belian aset) — hasilnya menjadi berganda.",
        "Jurnal manual wajib seimbang dan akaunnya mesti akaun anak, bukan akaun induk.",
        "Tempoh yang sudah ditutup tidak boleh menerima jurnal bertarikh di dalamnya — rekod pembetulan dengan tarikh hari ini.",
        "Menggunakan akaun Tunai dalam jurnal manual mengubah baki tunai; pastikan wangnya benar-benar bergerak.",
      ],
      steps: [
        "Untuk menyemak: tapis tempoh, cari mengikut rujukan/keterangan, buka butiran baris untuk melihat akaun debit–kreditnya.",
        "Untuk pembetulan: buat jurnal manual yang membalikkan bahagian yang salah lalu merekod yang betul, dengan keterangan jelas (\"Pembetulan salah akaun perbelanjaan tarikh …\").",
        "Sumbangan modal: Debit Tunai/Bank, Kredit 3110 Modal Pemilik. Ambilan: Debit 3130 Ambilan Pemilik, Kredit Tunai/Bank.",
      ],
    },

    "Neraca Saldo": {
      summary: "Senarai baki semua akaun bagi satu tempoh. Alat kawalan utama: jumlah Debit mesti sama dengan jumlah Kredit.",
      concept: [
        "Imbangan Duga (Trial Balance) meringkaskan jurnal setiap akaun: berapa bertambah (debit), berapa berkurang (kredit), dan bakinya.",
        "Jika jumlah Debit = jumlah Kredit, pencatatan seimbang. Seimbang belum tentu betul (akaun boleh tersalah pilih), tetapi tidak seimbang pasti ada masalah.",
        "Pasangan transaksi batal + pembalikannya yang kedua-duanya dalam tempoh disembunyikan kerana saling membatalkan.",
      ],
      uses: [
        "Titik permulaan menyemak kesihatan pembukuan sebelum melihat Penyata Untung Rugi dan Kunci Kira-kira.",
        "Memadankan baki akaun dengan kenyataan: baki Tunai Juruwang dengan wang dalam laci, baki Bank dengan penyata bank, baki QRIS dengan papan pemuka penyedia QRIS.",
      ],
      watch: [
        "Baki tidak normal (ditanda): Aset bernilai negatif atau Liabiliti berbaki debit. Biasanya ada transaksi dunia sebenar yang belum direkodkan (deposit, tambah nilai, penjelasan).",
        "Angka besar dalam lajur Debit/Kredit ialah pergerakan, bukan baki. Lihat lajur baki untuk nilai akhirnya.",
        "Ada baki Belum Terima sedangkan semua pelanggan sudah bayar penuh → semak tab Belum Terima dan Audit.",
      ],
      steps: [
        "Setiap hari/minggu: padankan baki Tunai Juruwang, Bank, dan e-dompet dengan wang/baki sebenar.",
        "Klik mana-mana akaun untuk melihat jurnal pembentuknya (lejar am). Aktifkan \"paparkan transaksi dibatalkan\" hanya untuk tujuan audit.",
        "Selisih yang tidak dapat dijelaskan → jalankan tab Audit.",
      ],
    },

    "Piutang (AR)": {
      summary: "Tagihan kepada pelanggan yang belum dibayar penuh — wang yang masih menjadi hak outlet.",
      concept: [
        "Akaun Belum Terima (Accounts Receivable) muncul secara automatik apabila pesanan/sewaan ditutup tetapi bayarannya kurang. Bakinya direkodkan ke akaun 1141 Penghutang Pelanggan (lalai).",
        "Apabila pelanggan menjelaskan, penghutang berkurang dan Tunai/Bank/e-dompet bertambah — hasil tidak bertambah lagi, kerana hasilnya sudah diiktiraf semasa pesanan.",
        "Umur penghutang (aging) dikumpulkan: belum matang, 1–30, 31–60, dan lebih daripada 60 hari.",
      ],
      uses: [
        "Menagih pelanggan yang belum menjelaskan bayaran dan memantau berapa lama tagihannya tertunggak.",
        "Menerima penjelasan terus dari tab ini dengan kaedah pembayaran yang digunakan pelanggan.",
      ],
      watch: [
        "Penghutang lebih daripada 60 hari berisiko tidak dapat dikutip. Prinsip berhemat: pertimbangkan hapus kira (jurnal manual ke perbelanjaan hutang lapuk) jika jelas tidak akan dibayar.",
        "Jangan terima penjelasan di menu lain dan juga di sini — pilih satu tempat supaya tidak direkodkan dua kali.",
        "Penghutang yang \"transaksi asalnya sudah tiada\" tidak boleh dibayar melalui butang; selesaikan dengan jurnal manual.",
      ],
      steps: [
        "Semak tab ini setiap hari sebelum tutup syif.",
        "Klik Terima Bayaran → isi jumlah (boleh sebahagian) → pilih kaedah → simpan. Wang masuk ke akaun mengikut Pemetaan Akaun kaedah tersebut.",
        "Bulanan: tinjau umur penghutang; tagih yang lebih daripada 30 hari, putuskan hapus kira bagi yang tidak dapat dikutip.",
      ],
    },

    "Hutang (AP)": {
      summary: "Semua obligasi outlet yang belum dibayar: kepada pembekal, belian aset, dan perbelanjaan yang direkodkan sebagai hutang.",
      concept: [
        "Akaun Belum Bayar (Accounts Payable) wujud apabila anda menerima barang/perkhidmatan tetapi membayarnya kemudian: Belian Pembekal secara kredit (2111 Pemiutang Pembekal), Belian Aset dengan wang pendahuluan/kredit (Hutang Belian Aset, lalai 2163), dan Perbelanjaan yang direkodkan sebagai hutang.",
        "Membayar hutang tidak menambah perbelanjaan lagi — perbelanjaan/asetnya sudah direkodkan semasa transaksi asal. Pembayaran hanya mengurangkan hutang dan Tunai/Bank.",
      ],
      uses: [
        "Melihat semua tagihan yang perlu dibayar di satu tempat beserta umurnya.",
        "Membayar (penuh atau ansuran) terus dari sini.",
      ],
      watch: [
        "Hutang yang melepasi tarikh matang menjejaskan hubungan dengan pembekal — pantau lajur umur.",
        "Bayar melalui tab ini atau menu asalnya, jangan tambah jurnal manual — hasilnya berganda.",
        "Pilih akaun tunai/bank yang benar-benar mengeluarkan wang. Jika dari laci juruwang, pembayaran turut mengurangkan jangkaan tunai syif.",
      ],
      steps: [
        "Mingguan: susun dari yang paling lama, jadualkan pembayaran.",
        "Klik Bayar → isi jumlah (untuk pembekal dan aset boleh ansuran) → pilih kaedah dan akaun tunai/bank → simpan.",
        "Akhir bulan: baki akaun hutang dalam Imbangan Duga mesti sama dengan jumlah dalam tab ini.",
      ],
    },

    "Laba Rugi": {
      summary: "Sama ada perniagaan untung atau rugi dalam satu tempoh: Hasil ditolak kos jualan dan Perbelanjaan.",
      concept: [
        "Penyata Untung Rugi disediakan berasaskan akruan (SAK EMKM): hasil diiktiraf apabila transaksi berlaku (tarikh perniagaan pesanan), bukan apabila wang diterima; perbelanjaan diiktiraf apabila berlaku.",
        "Untung Kasar = Hasil − Kos Jualan (kos barang yang dijual). Untung Bersih = Untung Kasar − Perbelanjaan Operasi (gaji, elektrik, sewa, susut nilai, dsb.) ± pendapatan/perbelanjaan lain.",
        "Susut nilai aset ialah perbelanjaan walaupun tiada wang keluar — mencerminkan nilai PS/TV yang berkurang kerana digunakan.",
      ],
      uses: [
        "Menilai prestasi setiap bulan dan membandingkan antara tempoh.",
        "Melihat sumber hasil terbesar (sewa, F&B, produk, PPOB) dan butiran kos terbesar.",
        "Asas pengiraan PPh Final UMKM Indonesia (0.5% daripada peredaran kasar).",
      ],
      watch: [
        "Untung besar tetapi tunai sedikit adalah biasa jika ada penghutang, stok bertambah, atau belian aset — lihat Aliran Tunai.",
        "Amaran \"kos jualan belum dikira\" bermaksud ada produk tanpa Harga Kos; untungnya kelihatan lebih besar daripada sebenarnya.",
        "Tanpa menjalankan susut nilai bulanan, untung kelihatan terlalu tinggi.",
        "Perbelanjaan yang belum direkodkan (bil elektrik/internet bulan ini) membuatkan untung kelihatan lebih besar — rekod sebagai perbelanjaan berhutang jika belum dibayar.",
      ],
      steps: [
        "Pilih tempoh (biasanya bulan lepas selepas tutup buku) dan bandingkan dengan tempoh sebelumnya.",
        "Klik mana-mana baris untuk melihat transaksi pembentuknya.",
        "Sebelum membaca untung akhir bulan: pastikan semua perbelanjaan sudah direkodkan, susut nilai sudah dijalankan, dan kiraan stok sudah dibuat.",
      ],
    },

    Rekonsiliasi: {
      summary: "Memadankan transaksi jualan (halaman Transaksi) dengan jurnal hasilnya, setiap pesanan.",
      concept: [
        "Setiap pesanan yang dibayar penuh sepatutnya mempunyai tepat satu jurnal jualan dengan nilai dan tarikh perniagaan yang sama.",
        "Status: Sepadan, Menunggu pembayaran, Tarikh berbeza, Jumlah berbeza, Jurnal hilang, Pesanan batal tetapi jurnal masih ada, dan Jurnal tanpa pesanan.",
      ],
      uses: [
        "Memastikan perolehan dalam laporan jualan sama dengan hasil dalam Penyata Untung Rugi.",
        "Membetulkan jurnal yang tertinggal/berbeza dengan butang Segerak Semula tanpa input manual.",
      ],
      watch: [
        "Jumlah berbeza atau jurnal hilang bermaksud Penyata Untung Rugi tidak tepat untuk tarikh itu.",
        "Pesanan selepas tengah malam direkodkan pada tarikh perniagaan (hari dibuka), bukan waktu bayar — ini disengajakan.",
        "Segerak Semula membatalkan jurnal lama lalu mempostingnya semula; tidak boleh dibuat untuk tempoh yang sudah ditutup.",
      ],
      steps: [
        "Harian (selepas tutup syif): pilih \"hari ini\", pastikan semua baris Sepadan atau Menunggu pembayaran.",
        "Baris bermasalah → klik Segerak Semula, kemudian muat semula untuk memastikan statusnya Sepadan.",
        "Lakukan sebelum Tutup Tempoh setiap bulan.",
      ],
    },

    Neraca: {
      summary: "Kedudukan kewangan pada satu tarikh: apa yang dimiliki (Aset), apa yang terhutang (Liabiliti), dan modal pemilik (Ekuiti).",
      concept: [
        "Persamaan asas yang sentiasa berlaku: Aset = Liabiliti + Ekuiti. Dalam SAK EMKM laporan ini dipanggil Penyata Kedudukan Kewangan.",
        "Aset tetap (PS, TV, perabot) dibentangkan pada kos perolehan ditolak susut nilai terkumpul = nilai buku.",
        "Untung tahun semasa masuk ke Ekuiti; selepas tutup tahun menjadi Untung Tertahan.",
      ],
      uses: [
        "Mengetahui kekayaan bersih perniagaan dan keupayaan membayar hutang (tunai + penghutang berbanding hutang jangka pendek).",
        "Dokumen yang biasanya diminta oleh bank/syarikat pajakan untuk permohonan pinjaman.",
      ],
      watch: [
        "Kunci Kira-kira mesti seimbang. Jika tidak, jalankan tab Audit.",
        "Baki Tunai dalam Kunci Kira-kira mesti sama dengan wang sebenar; selisih bermaksud ada transaksi yang belum/salah direkodkan.",
        "Inventori mesti sesuai dengan hasil kiraan stok.",
      ],
      steps: [
        "Pilih tarikh (biasanya akhir bulan) selepas semua transaksi bulan itu lengkap.",
        "Klik baris untuk menjejak angka yang janggal.",
        "Bandingkan dengan akhir bulan lepas untuk melihat perubahan hutang, penghutang, dan modal.",
      ],
    },

    "Arus Kas": {
      summary: "Wang yang benar-benar masuk dan keluar dari akaun tunai dan bank dalam satu tempoh.",
      concept: [
        "Berbeza dengan Penyata Untung Rugi: Aliran Tunai hanya mengira wang yang bergerak. Jualan yang belum dibayar (penghutang) tidak masuk; belian aset dan pembayaran hutang masuk sebagai tunai keluar walaupun bukan perbelanjaan.",
        "Dikira terus daripada pergerakan akaun Tunai/Bank dalam jurnal, jadi tunai bersih sentiasa sama dengan perubahan baki akaun-akaun itu dalam Imbangan Duga. Akaun yang dikira (tunai 111x, bank 112x, dan akaun yang didaftarkan sebagai tunai/bank) disenaraikan di bawah laporan.",
        "Pindahan tunai antara laci/akaun sendiri bernilai sifar bersih dan tidak dikira sebagai aliran tunai.",
      ],
      uses: [
        "Mengetahui dari mana wang datang dan ke mana wang pergi.",
        "Merancang pembayaran besar (pembekal, ansuran aset, gaji) berdasarkan corak tunai harian.",
      ],
      watch: [
        "Untung besar tetapi tunai bersih negatif: semak belian aset, penjelasan hutang, penambahan stok, atau penghutang yang menimbun.",
        "Tunai masuk/keluar yang janggal selalunya berasal daripada jurnal manual yang menggunakan akaun Tunai — jejak dalam Jurnal.",
      ],
      steps: [
        "Mingguan/bulanan: pilih tempoh, lihat kategori tunai keluar terbesar.",
        "Pastikan tunai bersih tempoh = perubahan baki akaun tunai/bank dalam Imbangan Duga bagi tempoh yang sama.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Nota kepada Penyata Kewangan — komponen ketiga yang diwajibkan SAK EMKM, disediakan secara automatik.",
      concept: [
        "SAK EMKM (Standard Perakaunan Kewangan Indonesia untuk Entiti Mikro, Kecil dan Sederhana) mewajibkan tiga laporan: Penyata Kedudukan Kewangan (Kunci Kira-kira), Penyata Untung Rugi, dan Nota.",
        "Nota menerangkan identiti perniagaan, asas penyediaan (akruan, kos sejarah), dasar perakaunan (inventori purata berwajaran atau FIFO mengikut pilihan outlet, susut nilai garis lurus), butiran item laporan, dan cukai pendapatan.",
      ],
      uses: [
        "Melengkapkan penyata kewangan untuk bank, pelabur, koperasi, atau pelaporan cukai.",
        "Dicetak / disimpan sebagai PDF bersama Kunci Kira-kira dan Penyata Untung Rugi.",
      ],
      watch: [
        "Data identiti (nama, alamat, NPWP, bentuk perniagaan) diambil daripada data outlet dalam Tetapan — lengkapkan di sana.",
        "Anggaran PPh Final 0.5% bersifat makluman; kewajipan sebenar mengikut status dan kemudahan cukai anda.",
        "Isi Nota hanya setepat pembukuannya — jalankan Audit dan pastikan tempoh sudah lengkap sebelum mencetak.",
      ],
      steps: [
        "Pilih tempoh laporan (biasanya satu tahun kewangan, atau bulanan untuk laporan dalaman).",
        "Semak butiran aset tetap dan cukai, kemudian klik Cetak / Simpan PDF.",
      ],
    },

    Audit: {
      summary: "Semakan automatik kesihatan pembukuan berdasarkan prinsip berhemat — cari masalah sebelum masalah itu masuk ke laporan.",
      concept: [
        "Audit menyemak perkara yang tidak kelihatan dalam laporan: jurnal berganda, jurnal tidak seimbang, transaksi batal yang masih berkuat kuasa, sumber posting tunai yang tidak sah, pemetaan akaun yang salah, nilai inventori, stok negatif, kos jualan kosong, baki tidak normal, penghutang yang menua, tempoh belum ditutup, dan cukai.",
        "Hijau = selamat, kuning = perlu diberi perhatian, merah = mesti dibaiki.",
        "Pembaikan automatik sentiasa berupa jurnal pembetulan/pembalikan yang direkodkan dan masuk log audit — tiada data yang dipadam.",
      ],
      uses: [
        "Semakan rutin sebelum tutup buku bulanan.",
        "Mencari punca apabila baki Tunai, Penghutang, atau Untung kelihatan janggal.",
      ],
      watch: [
        "Baca penjelasan setiap penemuan sebelum menekan butang pembaikan.",
        "Pelarasan nilai inventori hanya dibuat selepas Harga Kos produk dan kiraan stok betul.",
        "Penemuan yang tiada pembaikan automatik perlu ditangani secara manual (cth. mengisi Harga Kos, meninjau syif).",
      ],
      steps: [
        "Jalankan sekurang-kurangnya seminggu sekali dan wajib sebelum Tutup Tempoh.",
        "Tangani merah dahulu, kemudian kuning. Jalankan semula Audit sehingga bersih.",
      ],
    },

    "Tutup Periode": {
      summary: "Mengunci bulan yang sudah selesai dilaporkan supaya angkanya tidak berubah lagi.",
      concept: [
        "Selepas tempoh ditutup, tiada jurnal baharu (automatik atau manual) yang boleh bertarikh dalam tempoh itu.",
        "Pembetulan selepas tutup direkodkan dengan tarikh hari ini (tempoh semasa), bukan dengan membuka semula tempoh lama.",
      ],
      uses: [
        "Memastikan laporan yang sudah diserahkan kepada pemilik/bank/pihak cukai kekal sama.",
        "Mencegah transaksi bertarikh ke belakang (backdate) yang boleh menjadi celah penipuan.",
      ],
      watch: [
        "Tutup hanya selepas semua transaksi bulan itu lengkap: syif ditutup, perbelanjaan direkodkan, susut nilai dijalankan, kiraan stok, penyesuaian bank.",
        "Buka semula tempoh hanya untuk kes yang benar-benar perlu dan hanya oleh Pemilik — setiap buka/tutup direkodkan.",
      ],
      steps: [
        "Senarai semak akhir bulan (1–5 hb bulan berikutnya): tutup semua syif → rekod perbelanjaan & bil → jalankan susut nilai dalam menu Aset Tetap → kiraan stok → padankan baki bank/e-dompet → Penyesuaian → Audit bersih.",
        "Pilih bulan → Tutup Tempoh.",
        "Cetak Kunci Kira-kira, Penyata Untung Rugi, dan Nota bulan itu sebagai arkib.",
      ],
    },

    "Migrasi Data": {
      summary: "Memindahkan pembukuan daripada sistem/catatan lama ke NEXBILL.",
      concept: [
        "Cara standard migrasi: satu jurnal Baki Pembukaan pada tarikh peralihan yang mengandungi baki setiap akaun (Tunai, Bank, Penghutang, Inventori, Aset, Hutang, Modal). Transaksi lama tidak perlu dipindahkan satu demi satu.",
        "Selisih debit–kredit baki pembukaan ditampung dalam 3400 Ekuiti Baki Pembukaan (lalai).",
        "Import Data Sejarah (Excel) hanya untuk keperluan laporan tempoh lalu; data itu tidak muncul di halaman Transaksi atau stok.",
      ],
      uses: [
        "Memulakan NEXBILL tanpa kehilangan baki daripada sistem sebelumnya.",
        "Membandingkan laporan sebelum dan selepas menggunakan NEXBILL.",
      ],
      watch: [
        "Baki pembukaan diinput SEKALI. Menginputnya dua kali menggandakan semua baki.",
        "Aset tetap yang sudah dimiliki lebih kemas direkodkan melalui Aset Tetap → Belian Aset → \"Baki pembukaan\" supaya disusutnilaikan setiap unit — jangan rekod lagi dalam jurnal baki pembukaan.",
        "Stok awal produk direkodkan melalui Inventori (stok awal), bukan di sini, supaya kuantiti unit dan nilainya selari.",
      ],
      steps: [
        "Tentukan tarikh peralihan (biasanya awal bulan).",
        "Sediakan baki setiap akaun daripada laporan lama pada tarikh itu, kemudian input dalam Baki Pembukaan sehingga jumlah debit = kredit.",
        "Pilihan: import data sejarah melalui templat Excel.",
        "Semak Kunci Kira-kira pada tarikh peralihan — mesti sama dengan kunci kira-kira lama anda.",
      ],
    },
  },

  workflow: [
    {
      when: "Sekali di awal",
      items: [
        "Semak Carta Akaun; tambah akaun bank dan e-dompet yang digunakan.",
        "Tetapkan Pemetaan Akaun kaedah pembayaran ke akaun yang betul.",
        "Input Baki Pembukaan (tab Migrasi Data), stok awal produk (Inventori), dan aset yang sudah dimiliki (Aset Tetap → Belian Aset → Baki pembukaan).",
      ],
    },
    {
      when: "Setiap hari",
      items: [
        "Juruwang buka dan tutup syif; kira wang laci dengan jujur — selisih tunai ialah amaran utama.",
        "Rekod setiap perbelanjaan dalam menu Perbelanjaan, belian stok dalam Belian Pembekal, belian PS/TV/perabot dalam Aset Tetap → Belian Aset.",
        "Semak Belum Terima: tagih yang belum dijelaskan.",
        "Penyesuaian hari ini: semua pesanan mesti Sepadan.",
      ],
    },
    {
      when: "Setiap minggu",
      items: [
        "Padankan baki Bank dan e-dompet/QRIS dalam Imbangan Duga dengan penyata bank/papan pemuka penyedia.",
        "Bayar hutang pembekal/aset yang matang (tab Belum Bayar).",
        "Jalankan tab Audit dan tangani penemuan merah.",
      ],
    },
    {
      when: "Setiap akhir bulan",
      items: [
        "Rekod bil bulanan (elektrik, internet, sewa, gaji) — sebagai hutang jika belum dibayar.",
        "Jalankan Susut Nilai dalam menu Aset Tetap.",
        "Kiraan stok dalam Inventori.",
        "Audit sehingga bersih, kemudian Tutup Tempoh.",
        "Baca Penyata Untung Rugi, Kunci Kira-kira, dan Aliran Tunai; simpan PDF sebagai arkib.",
      ],
    },
    {
      when: "Setiap akhir tahun",
      items: [
        "Pastikan 12 bulan sudah ditutup.",
        "Cetak Penyata Kedudukan Kewangan, Penyata Untung Rugi, dan Nota (SAK EMKM) tahunan.",
        "Kira dan bayar PPh Final UMKM (0.5% peredaran kasar jika masih layak), kemudian rekod pembayarannya.",
      ],
    },
  ],

  goldenRules: [
    "Satu transaksi direkodkan sekali, dalam menunya sendiri. Jurnal manual hanya untuk yang tiada menu.",
    "Jangan padam — batalkan. Pembatalan membuat jurnal pembalikan supaya jejaknya masih boleh diaudit.",
    "Asingkan wang peribadi dan wang perniagaan. Ambilan peribadi direkodkan sebagai Ambilan Pemilik, bukan perbelanjaan.",
    "Setiap selisih (tunai laci, baki bank, stok) mesti dijelaskan, bukan dibiarkan.",
    "Laporan hanya setepat inputnya: harga kos produk, susut nilai, dan perbelanjaan yang lengkap menentukan untung yang betul.",
  ],

  ui: {
    guidePrefix: "Panduan",
    open: "Baca panduan",
    close: "Tutup",
    concept: "Konsep perakaunannya",
    uses: "Kegunaan",
    watch: "Perkara yang perlu diberi perhatian",
    steps: "Langkah kerja",
    workflowTitle: "Panduan Aliran Kerja Perakaunan Outlet",
    workflowIntro:
      "Hampir semua jurnal dibuat secara automatik daripada juruwang, sewaan, perbelanjaan, belian pembekal, dan aset. Tugas anda: memastikan setiap transaksi direkodkan dalam menunya, kemudian menyemak dan menutup buku secara rutin.",
    closeAria: "Tutup panduan",
    goldenRules: "Peraturan emas pembukuan",
    startFrom: "Mulakan dari:",
  },
};
