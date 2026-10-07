import type { AccountingGuideSet } from "./guides";

/** Versi Bahasa Melayu guides.ts. */
export const GUIDES_MS: AccountingGuideSet = {
  tabs: {
    "Chart of Accounts": {
      summary: "Senarai semua \"laci\" rekod kewangan outlet (akaun). Setiap ringgit/rupiah yang masuk atau keluar sentiasa direkod ke salah satu akaun di sini.",
      concept: [
        "Carta Akaun (CoA) ialah senarai akaun yang dikumpulkan kepada 5 golongan: 1 Aset (yang dimiliki), 2 Liabiliti (hutang/obligasi), 3 Ekuiti (modal pemilik), 4 Hasil, 5–8 Belanja (kos jualan dan kos operasi).",
        "Akaun induk (pengepala, dicetak tebal) hanya menjumlahkan akaun di bawahnya dan tidak boleh menerima jurnal. Transaksi sentiasa masuk ke akaun anak (akaun posting).",
        "Baki normal: Aset dan Belanja bertambah di sebelah Debit; Liabiliti, Ekuiti, dan Hasil bertambah di sebelah Kredit.",
      ],
      uses: [
        "Menentukan item yang muncul dalam Kunci Kira-kira dan Untung Rugi.",
        "Menambah akaun khusus untuk perniagaan anda, contohnya akaun bank kedua, akaun e-dompet baharu, atau jenis belanja tertentu.",
      ],
      watch: [
        "Jangan padam atau tukar golongan akaun yang sudah ada transaksi — laporan tempoh lalu turut berubah. Jika tidak digunakan lagi, nyahaktifkan sahaja.",
        "Kod akaun mengikut golongan: akaun bank mesti bermula 112x, e-dompet 113x, belanja 6xxx. Kod yang salah golongan menyebabkan akaun muncul di bahagian laporan yang salah.",
        "Setiap outlet mempunyai CoA sendiri. Akaun satu outlet tidak boleh digunakan oleh outlet lain.",
      ],
      steps: [
        "Semasa mula menggunakan NEXBILL: semak senarai akaun lalai, tambah akaun bank/e-dompet yang benar-benar anda gunakan.",
        "Tambah akaun baharu hanya jika tiada akaun lalai yang sesuai — pilih induk yang betul supaya masuk golongan laporan yang tepat.",
        "Selepas menambah akaun tunai/bank/e-dompet, pautkan di tab Account Mapping (modul Payment) supaya transaksi masuk ke situ secara automatik.",
      ],
    },

    "Account Mapping": {
      summary: "Peraturan automatik \"transaksi jenis X direkod ke akaun Y\". Juruwang tidak pernah memilih akaun — sistem mengikut jadual ini.",
      concept: [
        "Setiap modul (Sewa, F&B, Produk, PPOB, Belanja, Aset, Bayaran, dll.) mencari akaun sasarannya dalam jadual ini berdasarkan modul + jenis transaksi.",
        "Contoh: modul Payment kunci \"qris\" → akaun 1131 QRIS (lalai), jadi setiap bayaran QRIS menambah baki akaun QRIS, bukan Tunai.",
        "Jika sesuatu baris tiada, sistem menggunakan akaun lalai. Jadi jadual ini untuk MENYESUAIKAN, bukan wajib diisi dari kosong.",
      ],
      uses: [
        "Memisahkan hasil mengikut jenis konsol/produk supaya Untung Rugi lebih terperinci.",
        "Menentukan ke akaun mana wang daripada setiap kaedah bayaran masuk — asas penyesuaian baki setiap saluran semasa tutup syif.",
        "Mengarahkan kos jualan, susut nilai, inventori, dan hutang belian aset ke akaun yang anda mahu.",
      ],
      watch: [
        "Jenis akaun mesti sepadan dengan fungsinya: hasil → akaun hasil, bayaran → akaun tunai/bank, kos jualan/belanja → akaun belanja. Tab Audit menyemak ini secara automatik.",
        "Lajur kunci (transaction key) ialah perkataan yang dicari sistem — jangan diubah. Mengubah kunci menyebabkan baris itu berhenti digunakan tanpa mesej ralat.",
        "Perubahan mapping hanya berlaku untuk transaksi BAHARU. Transaksi lama kekal di akaun lamanya; pindahkan dengan jurnal manual jika perlu.",
        "Kaedah bayaran tersuai yang belum di-mapping akan masuk ke akaun Bank umum (1121) — tab Audit akan memberi amaran.",
      ],
      steps: [
        "Selepas menambah kaedah bayaran baharu (cth. e-dompet lain), tambah baris modul Payment untuk kaedah itu ke akaun e-dompet yang sesuai.",
        "Tukar akaun sasaran melalui butang edit, kemudian semak beberapa transaksi seterusnya di tab Jurnal untuk memastikan akaunnya betul.",
        "Jalankan tab Audit → \"Account Mapping\" selepas mengubah apa-apa di sini.",
      ],
    },

    Jurnal: {
      summary: "Buku harian semua transaksi dalam bentuk debit–kredit. Hampir semua jurnal dibuat secara automatik oleh sistem.",
      concept: [
        "Setiap transaksi direkod dengan catatan bergu (double entry): jumlah Debit sentiasa sama dengan jumlah Kredit. Contoh sewa PS dibayar tunai Rp50,000: Debit Tunai Juruwang Rp50,000, Kredit Hasil Sewa Rp50,000.",
        "Lajur Sumber menunjukkan asal jurnal (Sewa, POS, Belanja, Belian Aset, Susut Nilai, Manual, dsb.).",
        "Transaksi yang dibatalkan TIDAK dipadam: sistem membuat jurnal pembalikan (debit/kredit ditukar) supaya bakinya kembali sifar dan jejak auditnya kekal.",
      ],
      uses: [
        "Menjejak asal usul sesuatu angka dalam laporan.",
        "Merekod transaksi yang tiada menu sendiri melalui Jurnal Manual: suntikan modal pemilik, ambilan peribadi, pembetulan salah rekod, faedah/caj bank, penyelesaian hutang lama.",
      ],
      watch: [
        "Jangan rekod semula melalui jurnal manual transaksi yang sudah direkod oleh modulnya (jualan, belanja, belian pembekal, belian aset) — hasilnya berganda.",
        "Jurnal manual mesti seimbang dan menggunakan akaun anak, bukan akaun induk.",
        "Tempoh yang sudah ditutup tidak boleh menerima jurnal bertarikh di dalamnya — rekod pembetulan dengan tarikh hari ini.",
        "Menggunakan akaun Tunai dalam jurnal manual mengubah baki tunai; pastikan wangnya memang benar-benar bergerak.",
      ],
      steps: [
        "Untuk menyemak: tapis tempoh, cari mengikut rujukan/keterangan, buka butiran baris untuk melihat akaun debit–kreditnya.",
        "Untuk membetulkan: buat jurnal manual yang membalikkan bahagian yang salah lalu merekod yang betul, dengan keterangan jelas (\"Pembetulan salah akaun belanja tarikh …\").",
        "Suntikan modal: Debit Tunai/Bank, Kredit 3110 Modal Pemilik. Ambilan: Debit 3130 Ambilan, Kredit Tunai/Bank.",
      ],
    },

    "Neraca Saldo": {
      summary: "Senarai baki semua akaun bagi satu tempoh. Alat kawalan utama: jumlah Debit mesti sama dengan jumlah Kredit.",
      concept: [
        "Imbangan Duga (Trial Balance) meringkaskan jurnal mengikut akaun: berapa bertambah (debit), berapa berkurang (kredit), dan bakinya.",
        "Jika jumlah Debit = jumlah Kredit, rekod seimbang. Seimbang belum tentu betul (akaun boleh tersalah pilih), tetapi tidak seimbang pasti ada masalah.",
        "Pasangan transaksi batal + pembalikannya yang sama-sama dalam tempoh disembunyikan kerana saling membatalkan.",
      ],
      uses: [
        "Titik permulaan menyemak kesihatan simpan kira sebelum melihat Untung Rugi dan Kunci Kira-kira.",
        "Memadankan baki akaun dengan kenyataan: baki Tunai Juruwang dengan wang di laci, baki Bank dengan penyata bank, baki QRIS dengan papan pemuka penyedia QRIS.",
      ],
      watch: [
        "Baki tidak normal (ditanda): Aset bernilai negatif atau Liabiliti berbaki debit. Biasanya ada transaksi dunia nyata yang belum direkod (deposit, tambah nilai, penyelesaian).",
        "Angka besar di lajur Debit/Kredit ialah pergerakan, bukan baki. Lihat lajur baki untuk nilai akhirnya.",
        "Ada baki Penghutang walaupun semua pelanggan sudah membayar penuh → semak tab Penghutang dan Audit.",
      ],
      steps: [
        "Setiap hari/minggu: padankan baki Tunai Juruwang, Bank, dan e-dompet dengan wang/baki sebenar.",
        "Klik mana-mana akaun untuk melihat jurnal di sebaliknya (lejar am). Aktifkan \"tunjuk transaksi dibatalkan\" hanya untuk tujuan audit.",
        "Perbezaan yang tidak dapat dijelaskan → jalankan tab Audit.",
      ],
    },

    "Piutang (AR)": {
      summary: "Tagihan kepada pelanggan yang belum dibayar penuh — wang yang masih menjadi hak outlet.",
      concept: [
        "Penghutang (Accounts Receivable) muncul secara automatik apabila pesanan/sewa ditutup tetapi bayarannya kurang. Bakinya direkod ke akaun 1141 Penghutang Pelanggan (lalai).",
        "Apabila pelanggan menjelaskan, penghutang berkurang dan Tunai/Bank/e-dompet bertambah — tidak menambah hasil lagi, kerana hasilnya sudah diiktiraf semasa pesanan.",
        "Umur penghutang (aging) dikumpulkan: belum matang, 1–30, 31–60, dan lebih 60 hari.",
      ],
      uses: [
        "Menuntut pelanggan yang belum menjelaskan bayaran dan memantau berapa lama tagihannya tertunggak.",
        "Menerima bayaran terus dari tab ini dengan kaedah bayaran yang digunakan pelanggan.",
      ],
      watch: [
        "Penghutang lebih 60 hari berisiko tidak dapat dikutip. Prinsip berhemat: pertimbangkan hapus kira (jurnal manual ke belanja hutang lapuk) jika jelas tidak akan dibayar.",
        "Jangan terima bayaran di menu lain dan juga di sini — pilih satu tempat supaya tidak direkod dua kali.",
        "Penghutang yang \"transaksi asalnya sudah tiada\" tidak boleh dibayar melalui butang; selesaikan dengan jurnal manual.",
      ],
      steps: [
        "Semak tab ini setiap hari sebelum tutup syif.",
        "Klik Terima Bayaran → isi jumlah (boleh sebahagian) → pilih kaedah → simpan. Wang masuk ke akaun mengikut Account Mapping kaedah tersebut.",
        "Bulanan: semak aging; tuntut yang lebih 30 hari, putuskan hapus kira bagi yang tidak dapat dikutip.",
      ],
    },

    "Hutang (AP)": {
      summary: "Semua obligasi outlet yang belum dibayar: kepada pembekal, untuk belian aset, dan belanja yang direkod sebagai hutang.",
      concept: [
        "Pemiutang (Accounts Payable) terhasil apabila anda menerima barang/perkhidmatan tetapi membayarnya kemudian: belian pembekal secara kredit (2111 Hutang Pembekal), Belian Aset dengan deposit/kredit (Hutang Belian Aset, lalai 2163), dan Belanja yang direkod sebagai hutang.",
        "Membayar hutang tidak menambah belanja lagi — belanja/asetnya sudah direkod semasa transaksi asal. Bayaran hanya mengurangkan hutang dan Tunai/Bank.",
      ],
      uses: [
        "Melihat semua tagihan yang perlu dibayar di satu tempat beserta umurnya.",
        "Membayar (penuh atau ansuran) terus dari sini.",
      ],
      watch: [
        "Hutang yang melepasi tarikh matang menjejaskan hubungan dengan pembekal — pantau lajur umur.",
        "Bayar melalui tab ini atau menu asalnya, jangan tambah jurnal manual — hasilnya berganda.",
        "Pilih akaun tunai/bank yang benar-benar mengeluarkan wang. Jika dari laci juruwang, bayaran turut mengurangkan jangkaan tunai syif.",
      ],
      steps: [
        "Mingguan: susun dari yang paling lama, jadualkan bayaran.",
        "Klik Bayar → isi jumlah (pembekal dan aset boleh ansuran) → pilih kaedah dan akaun tunai/bank → simpan.",
        "Hujung bulan: baki akaun hutang dalam Imbangan Duga mesti sama dengan jumlah dalam tab ini.",
      ],
    },

    "Laba Rugi": {
      summary: "Sama ada perniagaan untung atau rugi dalam satu tempoh: Hasil ditolak kos jualan dan Belanja.",
      concept: [
        "Untung Rugi disediakan atas asas akruan (SAK EMKM): hasil diiktiraf apabila transaksi berlaku (tarikh perniagaan pesanan), bukan apabila wang diterima; belanja diiktiraf apabila berlaku.",
        "Untung Kasar = Hasil − Kos Jualan (kos barang yang dijual). Untung Bersih = Untung Kasar − Belanja Operasi (gaji, elektrik, sewa, susut nilai, dsb.) ± pendapatan/belanja lain.",
        "Susut nilai aset ialah belanja walaupun tiada wang keluar — mencerminkan nilai PS/TV yang berkurang kerana digunakan.",
      ],
      uses: [
        "Menilai prestasi bulanan dan membandingkan antara tempoh.",
        "Melihat sumber hasil terbesar (sewa, F&B, produk, PPOB) dan item kos terbesar.",
        "Asas pengiraan cukai akhir PKS Indonesia (0.5% daripada perolehan kasar).",
      ],
      watch: [
        "Untung besar tetapi tunai sedikit adalah biasa jika ada penghutang, stok bertambah, atau belian aset — lihat Aliran Tunai.",
        "Amaran \"kos jualan belum dikira\" bermakna ada produk tanpa Harga Kos; untung kelihatan lebih besar daripada sebenarnya.",
        "Tanpa menjalankan susut nilai bulanan, untung kelihatan terlalu tinggi.",
        "Belanja yang belum direkod (bil elektrik/internet bulan ini) menjadikan untung kelihatan lebih besar — rekod sebagai belanja hutang jika belum dibayar.",
      ],
      steps: [
        "Pilih tempoh (biasanya bulan lepas selepas tutup buku) dan bandingkan dengan tempoh sebelumnya.",
        "Klik mana-mana baris untuk melihat transaksi di sebaliknya.",
        "Sebelum membaca untung hujung bulan: pastikan semua belanja sudah direkod, susut nilai sudah dijalankan, dan kiraan stok sudah dibuat.",
      ],
    },

    Rekonsiliasi: {
      summary: "Memadankan transaksi jualan (Halaman Transaksi) dengan jurnal hasilnya, mengikut pesanan.",
      concept: [
        "Setiap pesanan yang dibayar sepatutnya mempunyai tepat satu jurnal jualan dengan nilai dan tarikh perniagaan yang sama.",
        "Status: Sepadan, Menunggu bayaran, Tarikh berbeza, Jumlah berbeza, Jurnal hilang, Pesanan batal tetapi jurnal masih ada, dan Jurnal tanpa pesanan.",
      ],
      uses: [
        "Memastikan jualan dalam laporan jualan sama dengan hasil dalam Untung Rugi.",
        "Membetulkan jurnal yang tertinggal/berbeza dengan butang Segerakkan Semula tanpa input manual.",
      ],
      watch: [
        "Jumlah berbeza atau jurnal hilang bermakna Untung Rugi tidak tepat untuk tarikh itu.",
        "Pesanan yang melepasi tengah malam direkod pada tarikh perniagaan (hari dibuka), bukan masa bayar — ini disengajakan.",
        "Segerakkan semula membatalkan jurnal lama lalu memposting semula; tidak boleh dilakukan untuk tempoh yang sudah ditutup.",
      ],
      steps: [
        "Harian (selepas tutup syif): pilih \"hari ini\", pastikan semua baris Sepadan atau Menunggu bayaran.",
        "Baris bermasalah → klik Segerakkan Semula, kemudian muat semula untuk memastikan statusnya Sepadan.",
        "Lakukan sebelum Tutup Tempoh setiap bulan.",
      ],
    },

    Neraca: {
      summary: "Kedudukan kewangan pada satu tarikh: apa yang dimiliki (Aset), apa yang terhutang (Liabiliti), dan modal pemilik (Ekuiti).",
      concept: [
        "Persamaan asas sentiasa berlaku: Aset = Liabiliti + Ekuiti. Dalam SAK EMKM laporan ini dipanggil Penyata Kedudukan Kewangan.",
        "Aset tetap (PS, TV, perabot) dibentangkan pada kos ditolak susut nilai terkumpul = nilai buku.",
        "Untung tahun semasa masuk ke Ekuiti; selepas tutup tahun menjadi Untung Tertahan.",
      ],
      uses: [
        "Mengetahui nilai bersih perniagaan dan keupayaan membayar hutang (tunai + penghutang berbanding hutang jangka pendek).",
        "Dokumen yang biasanya diminta bank/syarikat pajakan untuk permohonan pinjaman.",
      ],
      watch: [
        "Kunci Kira-kira mesti seimbang. Jika tidak, jalankan tab Audit.",
        "Baki Tunai dalam Kunci Kira-kira mesti sama dengan wang sebenar; perbezaan bermakna ada transaksi yang belum/salah direkod.",
        "Inventori mesti sepadan dengan hasil kiraan stok.",
      ],
      steps: [
        "Pilih tarikh (biasanya hujung bulan) selepas semua transaksi bulan itu lengkap.",
        "Klik baris untuk menjejak angka yang janggal.",
        "Bandingkan dengan hujung bulan lepas untuk melihat perubahan hutang, penghutang, dan modal.",
      ],
    },

    "Arus Kas": {
      summary: "Wang yang benar-benar masuk dan keluar daripada akaun tunai dan bank dalam satu tempoh.",
      concept: [
        "Berbeza dengan Untung Rugi: Aliran Tunai hanya mengira wang yang bergerak. Jualan yang belum dibayar (penghutang) tidak dikira; belian aset dan bayaran hutang dikira sebagai tunai keluar walaupun bukan belanja.",
        "Dikira terus daripada pergerakan akaun Tunai/Bank dalam jurnal, jadi tunai bersih sentiasa sama dengan perubahan baki akaun-akaun itu dalam Imbangan Duga. Akaun yang dikira (tunai 111x, bank 112x, dan akaun yang didaftarkan sebagai tunai/bank) disenaraikan di bawah laporan.",
        "Pindahan tunai antara laci/akaun sendiri bernilai sifar bersih dan tidak dikira sebagai aliran tunai.",
      ],
      uses: [
        "Mengetahui dari mana wang datang dan ke mana wang pergi.",
        "Merancang bayaran besar (pembekal, ansuran aset, gaji) berdasarkan corak tunai harian.",
      ],
      watch: [
        "Untung besar tetapi tunai bersih negatif: semak belian aset, penyelesaian hutang, penambahan stok, atau penghutang yang menimbun.",
        "Tunai masuk/keluar yang janggal selalunya berasal daripada jurnal manual yang menggunakan akaun Tunai — jejak di Jurnal.",
      ],
      steps: [
        "Mingguan/bulanan: pilih tempoh, lihat kategori tunai keluar terbesar.",
        "Pastikan tunai bersih tempoh = perubahan baki akaun tunai/bank dalam Imbangan Duga bagi tempoh yang sama.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Nota kepada Penyata Kewangan — komponen ketiga yang diwajibkan SAK EMKM, disediakan secara automatik.",
      concept: [
        "SAK EMKM (Standard Perakaunan Kewangan Indonesia untuk Entiti Mikro, Kecil dan Sederhana) mewajibkan tiga laporan: Penyata Kedudukan Kewangan (Kunci Kira-kira), Penyata Untung Rugi, dan Nota (CALK).",
        "Nota menerangkan identiti perniagaan, asas penyediaan (akruan, kos sejarah), dasar perakaunan (inventori purata wajaran atau FIFO mengikut pilihan outlet, susut nilai garis lurus), butiran item laporan, dan cukai pendapatan.",
      ],
      uses: [
        "Melengkapkan penyata kewangan untuk bank, pelabur, koperasi, atau pelaporan cukai.",
        "Dicetak / disimpan PDF bersama Kunci Kira-kira dan Untung Rugi.",
      ],
      watch: [
        "Data identiti (nama, alamat, nombor cukai, bentuk perniagaan) diambil daripada data outlet di Tetapan — lengkapkan di sana.",
        "Anggaran cukai akhir 0.5% hanyalah maklumat; liabiliti sebenar bergantung pada status dan kemudahan cukai anda.",
        "Isi Nota hanya setepat simpan kiranya — jalankan Audit dan pastikan tempoh sudah lengkap sebelum mencetak.",
      ],
      steps: [
        "Pilih tempoh laporan (biasanya satu tahun kewangan, atau bulanan untuk laporan dalaman).",
        "Semak butiran aset tetap dan cukai, kemudian klik Cetak / Simpan PDF.",
      ],
    },

    Audit: {
      summary: "Pemeriksaan automatik kesihatan simpan kira berdasarkan prinsip berhemat — cari masalah sebelum masalah itu masuk ke laporan.",
      concept: [
        "Audit menyemak perkara yang tidak kelihatan dalam laporan: jurnal berganda, jurnal tidak seimbang, transaksi batal yang masih berkuat kuasa, sumber posting tunai yang tidak sah, mapping akaun yang salah, nilai inventori, stok negatif, kos jualan kosong, baki tidak normal, penghutang yang menua, tempoh belum ditutup, dan cukai.",
        "Hijau = selamat, kuning = perlu perhatian, merah = mesti dibetulkan.",
        "Pembetulan automatik sentiasa berupa jurnal pembetulan/pembalikan yang direkod dan masuk log audit — tiada data dipadam.",
      ],
      uses: [
        "Semakan rutin sebelum tutup buku bulanan.",
        "Mencari punca apabila baki Tunai, Penghutang, atau Untung kelihatan janggal.",
      ],
      watch: [
        "Baca penjelasan setiap penemuan sebelum menekan butang pembetulan.",
        "Pelarasan nilai inventori hanya dibuat selepas Harga Kos produk dan kiraan stok betul.",
        "Penemuan tanpa pembetulan automatik perlu ditangani secara manual (cth. mengisi Harga Kos, menyemak syif).",
      ],
      steps: [
        "Jalankan sekurang-kurangnya seminggu sekali dan wajib sebelum Tutup Tempoh.",
        "Tangani merah dahulu, kemudian kuning. Jalankan semula Audit sehingga bersih.",
      ],
    },

    "Tutup Periode": {
      summary: "Mengunci bulan yang sudah selesai dilaporkan supaya angkanya tidak berubah lagi.",
      concept: [
        "Selepas tempoh ditutup, tiada jurnal baharu (automatik atau manual) boleh bertarikh di dalam tempoh itu.",
        "Pembetulan selepas tutup direkod dengan tarikh hari ini (tempoh semasa), bukan dengan membuka semula tempoh lama.",
      ],
      uses: [
        "Memastikan laporan yang sudah diserahkan kepada pemilik/bank/pihak cukai kekal sama.",
        "Mengelakkan transaksi bertarikh ke belakang (backdate) yang boleh menjadi celah penipuan.",
      ],
      watch: [
        "Tutup hanya selepas semua transaksi bulan itu lengkap: syif ditutup, belanja direkod, susut nilai dijalankan, kiraan stok, penyesuaian bank.",
        "Membuka semula tempoh hanya untuk kes yang benar-benar perlu dan hanya oleh Pemilik — setiap buka/tutup direkod.",
      ],
      steps: [
        "Senarai semak hujung bulan (1–5 hari bulan berikutnya): tutup semua syif → rekod belanja & bil → jalankan susut nilai di menu Aset → kiraan stok → padankan baki bank/e-dompet → Rekonsiliasi → Audit bersih.",
        "Pilih bulan → Tutup Tempoh.",
        "Cetak Kunci Kira-kira, Untung Rugi, dan Nota bulan itu sebagai arkib.",
      ],
    },

    "Migrasi Data": {
      summary: "Memindahkan simpan kira daripada sistem/rekod lama ke NEXBILL.",
      concept: [
        "Cara standard migrasi: satu jurnal Baki Awal pada tarikh peralihan yang mengandungi baki setiap akaun (Tunai, Bank, Penghutang, Inventori, Aset, Hutang, Modal). Transaksi lama tidak perlu dipindahkan satu persatu.",
        "Perbezaan debit–kredit baki awal ditampung dalam 3400 Ekuiti Baki Awal (lalai).",
        "Import Data Sejarah (Excel) hanya untuk keperluan laporan tempoh lalu; data itu tidak muncul di Halaman Transaksi atau stok.",
      ],
      uses: [
        "Memulakan NEXBILL tanpa kehilangan baki daripada sistem sebelumnya.",
        "Membandingkan laporan sebelum dan selepas menggunakan NEXBILL.",
      ],
      watch: [
        "Baki awal dimasukkan SEKALI. Memasukkannya dua kali menggandakan semua baki.",
        "Aset tetap yang sudah dimiliki lebih kemas direkod melalui menu Aset → Belian Aset → \"Baki awal\" supaya disusutnilaikan per unit — jangan rekod lagi dalam jurnal baki awal.",
        "Stok awal produk direkod melalui Inventori (stok awal), bukan di sini, supaya bilangan unit dan nilainya selari.",
      ],
      steps: [
        "Tentukan tarikh peralihan (biasanya awal bulan).",
        "Sediakan baki setiap akaun daripada laporan lama pada tarikh itu, kemudian masukkan dalam Baki Awal sehingga jumlah debit = kredit.",
        "Pilihan: import data sejarah melalui templat Excel.",
        "Semak Kunci Kira-kira pada tarikh peralihan — mesti sama dengan kunci kira-kira lama anda.",
      ],
    },
  },

  workflow: [
    {
      when: "Sekali pada permulaan",
      items: [
        "Semak Carta Akaun; tambah akaun bank dan e-dompet yang digunakan.",
        "Tetapkan Account Mapping kaedah bayaran ke akaun yang betul.",
        "Masukkan Baki Awal (tab Migrasi Data), stok awal produk (Inventori), dan aset yang sudah dimiliki (Aset → Belian Aset → Baki awal).",
      ],
    },
    {
      when: "Setiap hari",
      items: [
        "Juruwang buka dan tutup syif; kira wang laci dengan jujur — perbezaan tunai ialah penggera utama.",
        "Rekod setiap perbelanjaan di menu Belanja, belian stok di Belian Pembekal, belian PS/TV/perabot di Aset → Belian Aset.",
        "Semak Penghutang: tuntut yang belum dijelaskan.",
        "Rekonsiliasi hari ini: semua pesanan mesti Sepadan.",
      ],
    },
    {
      when: "Setiap minggu",
      items: [
        "Padankan baki Bank dan e-dompet/QRIS dalam Imbangan Duga dengan penyata bank/papan pemuka penyedia.",
        "Bayar hutang pembekal/aset yang sudah matang (tab Hutang).",
        "Jalankan tab Audit dan tangani penemuan merah.",
      ],
    },
    {
      when: "Setiap hujung bulan",
      items: [
        "Rekod bil bulanan (elektrik, internet, sewa, gaji) — sebagai hutang jika belum dibayar.",
        "Jalankan Susut Nilai di menu Aset.",
        "Kiraan stok di Inventori.",
        "Audit sehingga bersih, kemudian Tutup Tempoh.",
        "Baca Untung Rugi, Kunci Kira-kira, dan Aliran Tunai; simpan PDF sebagai arkib.",
      ],
    },
    {
      when: "Setiap hujung tahun",
      items: [
        "Pastikan 12 bulan sudah ditutup.",
        "Cetak Penyata Kedudukan Kewangan, Untung Rugi, dan Nota (SAK EMKM) tahunan.",
        "Kira dan bayar cukai akhir PKS Indonesia (0.5% perolehan kasar jika masih layak), kemudian rekod bayarannya.",
      ],
    },
  ],

  golden: [
    "Satu transaksi direkod sekali, di menunya sendiri. Jurnal manual hanya untuk yang tiada menu.",
    "Jangan padam — batalkan. Pembatalan membuat jurnal pembalikan supaya jejaknya masih boleh diaudit.",
    "Wang peribadi dan wang perniagaan diasingkan. Ambilan peribadi direkod sebagai Ambilan, bukan belanja.",
    "Setiap perbezaan (tunai laci, baki bank, stok) mesti dijelaskan, bukan dibiarkan.",
    "Laporan hanya setepat inputnya: harga kos produk, susut nilai, dan belanja yang lengkap menentukan untung yang sebenar.",
  ],
};
