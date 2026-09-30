import type { HelpCategory } from "../../types";

export const PENJUALAN: HelpCategory[] = [
  {
    id: "transaksi",
    group: "penjualan",
    label: "Transaksi (Sejarah, Refund & Void)",
    summary:
      "Tempat mencari semua transaksi (sewa, makanan/minuman, produk, PPOB), mencetak semula resit, melihat butiran perakaunannya, serta membatalkan atau memulangkan wang. Ada juga tab Prestasi Juruwang.",
    subsections: [
      {
        title: "Mencari transaksi",
        steps: [
          "Pilih tempoh (Hari Ini, Semalam, Minggu Ini, Bulan Ini, Tahun Ini, atau tarikh sendiri).",
          "Tapis mengikut juruwang, jenis transaksi, kaedah pembayaran, status, nama pelanggan, atau julat jumlah.",
          "Tekan Butiran untuk melihat item, bayaran, dan catatan perakaunannya (jurnal).",
          "Tekan Resit untuk mencetak semula resit.",
        ],
      },
      {
        title: "Membatalkan atau memulangkan wang",
        steps: [
          "Refund: memulangkan wang pelanggan (cth. tersalah caj). Void: membatalkan transaksi yang tersilap. Kedua-duanya wajib diberi sebab.",
          "Jika peranan anda tidak berhak secara terus, permohonan masuk giliran Kelulusan di Staf & Kebenaran dan menunggu penyelia meluluskan.",
          "Transaksi yang dibatalkan tidak hilang — tetap disimpan dengan status batal, dan perakaunannya diterbalikkan secara automatik.",
          "Tandakan Lunas (khas Owner/Superuser): memaksa bil yang tersangkut menjadi lunas tunai. Padam kekal hanya untuk kes khas dan tidak boleh dibatalkan — gunakan Void untuk pembatalan biasa.",
        ],
      },
      {
        title: "Prestasi Juruwang",
        steps: [
          "Pilih tempoh untuk melihat kedudukan juruwang: bilangan transaksi, jumlah jualan, purata, pecahan mengikut jenis, diskaun, void, bilangan syif, dan perbezaan tunai.",
        ],
      },
    ],
    notes: [
      "Melihat senarai transaksi memerlukan kebenaran melihat laporan (Owner, Superuser, Manager, Accountant, Supervisor). Juruwang dan dapur tidak boleh membuka senarainya.",
      "Untuk fail Excel/PDF, gunakan menu Laporan atau Perakaunan.",
    ],
    roles: "Melihat: Owner, Superuser, Manager, Accountant, Supervisor. Refund/void terus mengikut kebenaran peranan; peranan lain melalui Kelulusan.",
  },
  {
    id: "promo",
    group: "penjualan",
    label: "Promosi & Pakej Sewa",
    summary:
      "Buat pakej harga tetap untuk sewa PS (cth. \"Pakej 3 Jam PS4 Rp45.000\") yang boleh dipilih juruwang semasa memulakan sesi. Baucar diskaun belian dibuat di menu Keahlian & CRM.",
    steps: [
      "Isi nama pakej, konsol (Semua/PS3/PS4/PS5), tempoh dalam minit, dan harga pakej, kemudian tekan Simpan Pakej.",
      "Pakej terus muncul sebagai pilihan di panel Sesi Baharu halaman Sewa PS.",
      "Edit untuk mengubah, Nyahaktifkan untuk menyembunyikan buat sementara, Padam untuk membuang pakej yang belum pernah digunakan.",
      "Idea promosi waktu lengang: lihat carta Waktu Sibuk vs Lengang di Dashboard Ringkasan, kemudian buat pakej khas untuk jam-jam itu.",
    ],
    notes: [
      "Pakej yang sudah pernah digunakan tidak boleh dipadam — automatik dinyahaktifkan sahaja supaya sejarah transaksi tetap betul.",
      "Pakej hanya berlaku di Sewa PS, bukan di troli Juruwang.",
    ],
    roles: "Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "membership",
    group: "penjualan",
    label: "Keahlian & CRM (Pelanggan, Mata, Baucar)",
    summary:
      "Senarai pelanggan dengan sejarah belian, mata, dan tahap keahlian (automatik daripada jumlah belian atau dibeli), katalog ganjaran yang boleh ditebus dengan mata, serta baucar diskaun.",
    subsections: [
      {
        title: "Pelanggan",
        steps: [
          "Cari pelanggan (nama/no. telefon) atau tekan Tambah Pelanggan — cukup nama dan nombor telefon.",
          "Klik pelanggan untuk melihat jumlah belian, mata, tahap, sejarah transaksi/sewa/mata, dan ganjaran yang boleh ditebus.",
          "Tebus mata: tekan \"Tebus\" pada ganjaran — muncul kod penebusan. Ganjaran jenis diskaun main automatik menjadi baucar sekali guna untuk pelanggan itu.",
          "Jual/perbaharui keahlian: pilih tahap, pilih Tunai atau QRIS, tekan \"Bayar & Aktifkan\". Bayarannya automatik direkod dalam perakaunan dan tunai syif.",
        ],
      },
      {
        title: "Tahap keahlian (tier)",
        steps: [
          "Tambah tahap: nama (cth. Silver, Gold), jumlah belian minimum untuk naik, yuran keahlian (pilihan), pengganda mata, peratus diskaun, faedah, dan tempoh sah.",
          "Pelanggan naik tahap automatik setiap kali transaksi lunas dan jumlah beliannya memenuhi syarat. Tahap tidak turun secara automatik.",
          "Tahap yang mempunyai yuran keahlian juga boleh terus dijual di juruwang.",
        ],
      },
      {
        title: "Ganjaran",
        steps: ["Tambah ganjaran: nama, jenis (belian di jenama rakan kongsi atau diskaun main), bilangan mata yang diperlukan, kemudian butiran mengikut jenisnya."],
      },
      {
        title: "Baucar",
        steps: [
          "Isi kod (automatik huruf besar), jenis (peratus atau nominal), nilai, dan belian minimum, kemudian tekan Buat Baucar.",
          "Pelanggan cukup menyebut kodnya; juruwang menaip kod di Sewa PS atau Juruwang.",
        ],
        notes: ["Baucar berhenti berlaku apabila kuota penggunaannya habis."],
      },
    ],
    notes: [
      "Mata diperoleh automatik kira-kira 1 mata bagi setiap Rp10.000 belian (didarab pengganda tahap), ditambah mata main bagi setiap konsol untuk sesi sewa.",
      "Beberapa butang (padam pelanggan, tebus mata, edit/padam data induk) hanya kelihatan untuk Superuser.",
    ],
    roles: "Menjual keahlian: Owner, Superuser, Manager, Supervisor, Cashier. Mengatur tahap/ganjaran/baucar: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "ppob",
    group: "penjualan",
    label: "Bayaran Bil / PPOB (Kredit, Token, Tambah Nilai, Pengeluaran Tunai)",
    navHint: "Muncul di bar sisi jika modul PPOB aktif (Tetapan → Feature Management).",
    summary:
      "Rekod jualan produk digital — tambah nilai e-wallet, token elektrik, kredit telefon, bayar bil, pindahan, pengeluaran tunai — dalam aplikasi yang sama, dengan margin keuntungan dan kos pembekal direkod berasingan.",
    steps: [
      "Sekali di awal: tekan \"Urus Harga Pembekal & Margin\" untuk mengisi kos dan margin setiap produk.",
      "Isi borang transaksi: kategori, produk (harga & margin terisi automatik), nominal, nombor tujuan/rujukan, akaun sumber dana, dan akaun penerima.",
      "Pengeluaran Tunai: arah wangnya terbalik — pelanggan menerima wang tunai dari laci, baki deposit pembekal yang bertambah.",
      "Tersalah input? Tekan Batal (void). Edit dan padam kekal hanya untuk Superuser.",
      "Kad di atas memaparkan baki deposit PPOB dan bilangan transaksi tempoh ini.",
    ],
    notes: [
      "Baki deposit PPOB turut disemak setiap kali tutup syif, kerana digunakan bersama semua juruwang.",
      "Jika outlet tidak menjual PPOB, Superuser boleh mematikan modul ini — sejarah lama tetap selamat.",
    ],
    roles: "Owner, Superuser, Manager (mengikut kebenaran mengurus PPOB).",
  },
  {
    id: "marketplace",
    group: "penjualan",
    label: "Pasaran Outlet (Jual Beli Barang Terpakai)",
    summary:
      "Jual alat kawalan, konsol, TV, kerusi, atau kelengkapan yang tidak digunakan kepada outlet NEXBILL lain — atau beli barang terpakai daripada mereka. Percuma, tanpa caj perkhidmatan. Dilengkapi profil kepercayaan, akaun bank dikunci, bukti transaksi, ulasan, dan saluran aduan.",
    subsections: [
      {
        title: "Sebelum mula — Keselamatan & Akaun",
        steps: [
          "Buka tab Keselamatan & Akaun. Isi akaun penerima bayaran (bank/e-wallet, nombor, nama pemilik mengikut buku bank).",
          "Pembeli hanya diarahkan membayar ke akaun ini. Jika akaun ditukar, pembeli melihat amaran selama 7 hari.",
          "Lihat profil kepercayaan outlet anda: umur akaun, transaksi selesai, ulasan, dan aduan — beginilah outlet lain melihat anda.",
        ],
      },
      {
        title: "Menjual barang",
        steps: [
          "Tab Barang Saya → Pasang Barang: isi nama barang (cth. \"Alat kawalan PS4 DualShock, terpakai, masih cantik\"), kategori, harga seunit, bilangan unit, dan penerangan jujur (keadaan, kelengkapan, sebab dijual).",
          "Tambah sehingga 5 foto — barang dengan foto jauh lebih dipercayai dan cepat laku.",
          "Isi nombor telefon yang boleh dihubungi. Nombor ini tidak dipaparkan di etalase — hanya dibuka kepada pembeli selepas anda menerima tawarannya.",
          "Tekan Pasang di Etalase.",
          "Menarik barang daripada etalase wajib memilih sebabnya.",
        ],
      },
      {
        title: "Membeli barang",
        steps: [
          "Lihat etalase, cari atau tapis mengikut kategori, klik barang untuk melihat foto dan profil kepercayaan penjual.",
          "Tekan Mohon Beli: isi harga tawaran seunit, catatan untuk penjual, dan nombor telefon anda, kemudian Hantar Tawaran.",
        ],
      },
      {
        title: "Persetujuan & serah terima",
        steps: [
          "Penjual menerima tawaran di tab Persetujuan — nombor telefon kedua-dua pihak terus dibuka untuk mengatur serah terima.",
          "Pembeli membayar HANYA ke akaun yang tertera pada kad persetujuan, kemudian memuat naik bukti bayaran. Penjual memuat naik bukti serah terima/resit penghantaran.",
          "Penjual: serahkan barang selepas dana benar-benar masuk — semak penyata akaun, jangan hanya percaya foto bukti pindahan.",
          "Pembeli menekan \"Barang Diterima & Sudah Dibayar\" selepas barang diterima. Selepas itu kedua-dua pihak boleh saling memberi ulasan bintang.",
        ],
      },
      {
        title: "Jika ada masalah",
        steps: [
          "Tekan Laporkan Masalah pada kad persetujuan: pilih jenis masalah, tulis kronologi (apa yang dipersetujui, tarikh, jumlah), dan lampirkan bukti.",
          "Pihak yang dilaporkan boleh memberi maklum balas dan buktinya sendiri. Pasukan NEXBILL membuat keputusan selepas membaca kedua-dua pihak.",
          "Aduan palsu boleh berbalik menjadi sekatan kepada pelapor.",
        ],
      },
    ],
    notes: [
      "Tip selamat: semak profil pihak lawan, utamakan COD atau bayar selepas barang dilihat, pindahkan wang hanya ke akaun pada kad persetujuan, muat naik bukti dalam aplikasi.",
      "Jangan tulis nombor telefon, akaun lain, atau pautan dalam penerangan, sebab, atau ulasan — sistem menapisnya supaya transaksi kekal dilindungi bukti dalam aplikasi.",
      "Outlet yang baru menyertai mempunyai had nilai barang yang boleh dipasang sehingga reputasinya terbina.",
      "Jualan automatik direkod sebagai pendapatan penjual dalam perakaunan.",
    ],
  },
  {
    id: "chat",
    group: "penjualan",
    label: "Perkhidmatan Pelanggan (Tanya Pasukan NEXBILL)",
    navHint: "Ini saluran bantuan kepada pasukan pusat NEXBILL — bukan peti mesej pelanggan outlet anda.",
    summary: "Hantar soalan, aduan, cadangan, atau masalah teknikal terus kepada pasukan NEXBILL, lengkap dengan foto/video.",
    steps: [
      "Tekan \"+ Tiket Baharu\", isi tajuk (pilihan), kategori (Aduan/Cadangan/Masalah Teknikal/Lain-lain), dan mesej, kemudian Hantar ke Pusat.",
      "Lampirkan foto atau video skrin jika ada ralat — jauh lebih cepat difahami.",
      "Pilih tiket dalam senarai kiri untuk membaca perbualannya, balas di kotak \"Balas...\".",
      "Permohonan token NexbillAgent (kawalan Android TV) juga dibalas di sini.",
    ],
    notes: [
      "Balasan muncul automatik tanpa perlu muat semula.",
      "Pasukan NEXBILL membalas dalam bahasa mengikut Negara outlet anda (Tetapan → Perniagaan & Cukai).",
      "Status tiket (selesai/dibuka) diatur oleh pasukan NEXBILL.",
    ],
  },
  {
    id: "notifikasi",
    group: "penjualan",
    label: "Notifikasi & Pengumuman",
    navHint: "Ikon loceng di bahagian atas skrin.",
    summary:
      "Semua perkara yang memerlukan perhatian anda di satu tempat: stok hampir habis, permohonan kelulusan, perbelanjaan tertunda, tempahan, status langganan, dan pengumuman daripada pasukan NEXBILL.",
    steps: [
      "Tekan ikon loceng. Nombor merah menunjukkan notifikasi yang belum dibaca.",
      "Pilih Semua atau Belum Dibaca.",
      "Klik tajuk notifikasi untuk terus membuka halaman berkaitan (automatik ditanda dibaca), atau tekan \"Tanda dibaca\".",
      "\"Tanda semua dibaca\" untuk membersihkan semuanya.",
    ],
    notes: [
      "Jenis notifikasi yang dipaparkan boleh diatur di Tetapan → Notifikasi.",
      "Pengumuman penting daripada pasukan NEXBILL juga dipaparkan sebagai pop-up sekali semasa membuka dashboard sehingga anda menekan \"Faham\".",
    ],
  },
];
