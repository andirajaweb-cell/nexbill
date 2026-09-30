import type { HelpCategory } from "../../types";

export const PENJUALAN: HelpCategory[] = [
  {
    id: "transaksi",
    group: "penjualan",
    label: "Transaksi (Riwayat, Refund & Void)",
    summary:
      "Tempat mencari semua transaksi (rental, makanan/minuman, produk, PPOB), mencetak ulang struk, melihat rincian pembukuannya, serta membatalkan atau mengembalikan uang. Ada juga tab Performa Kasir.",
    subsections: [
      {
        title: "Mencari transaksi",
        steps: [
          "Pilih periode (Hari Ini, Kemarin, Minggu Ini, Bulan Ini, Tahun Ini, atau tanggal sendiri).",
          "Saring menurut kasir, jenis transaksi, metode pembayaran, status, nama pelanggan, atau rentang total.",
          "Tekan Detail untuk melihat item, pembayaran, dan catatan pembukuannya (jurnal).",
          "Tekan Struk untuk mencetak ulang struk.",
        ],
      },
      {
        title: "Membatalkan atau mengembalikan uang",
        steps: [
          "Refund: mengembalikan uang pelanggan (mis. salah tagih). Void: membatalkan transaksi yang keliru. Keduanya wajib diberi alasan.",
          "Kalau peranmu tidak berhak langsung, permintaan masuk antrean Approval di Staf & Hak Akses dan menunggu atasan menyetujui.",
          "Transaksi yang dibatalkan tidak hilang — tetap tersimpan dengan status batal, dan pembukuannya dibalik otomatis.",
          "Tandai Lunas (khusus Owner/Superuser): memaksa tagihan macet menjadi lunas tunai. Hapus permanen hanya untuk kasus khusus dan tidak bisa dibatalkan — gunakan Void untuk pembatalan biasa.",
        ],
      },
      {
        title: "Performa Kasir",
        steps: [
          "Pilih periode untuk melihat peringkat kasir: jumlah transaksi, total penjualan, rata-rata, rincian per jenis, diskon, void, jumlah shift, dan selisih kas.",
        ],
      },
    ],
    notes: [
      "Melihat daftar transaksi butuh izin melihat laporan (Owner, Superuser, Manager, Accountant, Supervisor). Kasir dan dapur tidak bisa membuka daftarnya.",
      "Untuk file Excel/PDF, gunakan menu Laporan atau Accounting.",
    ],
    roles: "Melihat: Owner, Superuser, Manager, Accountant, Supervisor. Refund/void langsung sesuai izin peran; peran lain lewat Approval.",
  },
  {
    id: "promo",
    group: "penjualan",
    label: "Promo & Paket Rental",
    summary:
      "Buat paket harga tetap untuk sewa PS (mis. \"Paket 3 Jam PS4 Rp45.000\") yang bisa dipilih kasir saat memulai sesi. Voucher diskon belanja dibuat di menu Membership & CRM.",
    steps: [
      "Isi nama paket, konsol (Semua/PS3/PS4/PS5), durasi dalam menit, dan harga paket, lalu tekan Simpan Paket.",
      "Paket langsung muncul sebagai pilihan di panel Sesi Baru halaman Rental PS.",
      "Edit untuk mengubah, Nonaktifkan untuk menyembunyikan sementara, Hapus untuk membuang paket yang belum pernah dipakai.",
      "Ide promo jam sepi: lihat grafik Jam Ramai vs Jam Sepi di Dashboard Ringkasan, lalu buat paket khusus untuk jam-jam itu.",
    ],
    notes: [
      "Paket yang sudah pernah dipakai tidak bisa dihapus — otomatis dinonaktifkan saja supaya riwayat transaksi tetap benar.",
      "Paket hanya berlaku di Rental PS, tidak di keranjang Kasir.",
    ],
    roles: "Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "membership",
    group: "penjualan",
    label: "Membership & CRM (Pelanggan, Poin, Voucher)",
    summary:
      "Daftar pelanggan dengan riwayat belanja, poin, dan tingkatan member (otomatis dari total belanja atau dibeli), katalog hadiah yang bisa ditukar poin, serta voucher diskon.",
    subsections: [
      {
        title: "Pelanggan",
        steps: [
          "Cari pelanggan (nama/HP) atau tekan Tambah Customer — cukup nama dan nomor HP.",
          "Klik pelanggan untuk melihat total belanja, poin, tingkatan, riwayat transaksi/sewa/poin, dan hadiah yang bisa ditukar.",
          "Tukar poin: tekan \"Tukar\" pada hadiah — muncul kode penukaran. Hadiah jenis diskon main otomatis menjadi voucher sekali pakai untuk pelanggan itu.",
          "Jual/perpanjang keanggotaan: pilih tingkatan, pilih Tunai atau QRIS, tekan \"Bayar & Aktifkan\". Pembayarannya otomatis tercatat di pembukuan dan kas shift.",
        ],
      },
      {
        title: "Tingkatan member (tier)",
        steps: [
          "Tambah tingkatan: nama (mis. Silver, Gold), minimal total belanja untuk naik, biaya keanggotaan (opsional), pengali poin, persen diskon, manfaat, dan masa berlaku.",
          "Pelanggan naik tingkatan otomatis setiap kali transaksi lunas dan total belanjanya memenuhi syarat. Tingkatan tidak turun otomatis.",
          "Tingkatan yang punya biaya keanggotaan juga bisa langsung dijual di kasir.",
        ],
      },
      {
        title: "Hadiah (reward)",
        steps: ["Tambah hadiah: nama, jenis (belanja di brand partner atau diskon main), jumlah poin yang dibutuhkan, lalu detail sesuai jenisnya."],
      },
      {
        title: "Voucher",
        steps: [
          "Isi kode (otomatis huruf besar), jenis (persen atau nominal), nilai, dan minimal belanja, lalu tekan Buat Voucher.",
          "Pelanggan cukup menyebutkan kodenya; kasir mengetik kode di Rental PS atau Kasir.",
        ],
        notes: ["Voucher berhenti berlaku saat kuota pemakaiannya habis."],
      },
    ],
    notes: [
      "Poin didapat otomatis sekitar 1 poin per Rp10.000 belanja (dikali pengali tingkatan), ditambah poin main per konsol untuk sesi rental.",
      "Beberapa tombol (hapus pelanggan, tukar poin, edit/hapus master) hanya terlihat untuk Superuser.",
    ],
    roles: "Menjual keanggotaan: Owner, Superuser, Manager, Supervisor, Cashier. Mengatur tingkatan/hadiah/voucher: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "ppob",
    group: "penjualan",
    label: "PPOB (Pulsa, Token, Top Up, Tarik Tunai)",
    navHint: "Muncul di sidebar kalau modul PPOB aktif (Pengaturan → Feature Management).",
    summary:
      "Catat penjualan produk digital — top up e-wallet, token listrik, pulsa, bayar tagihan, transfer, tarik tunai — dalam aplikasi yang sama, dengan margin keuntungan dan biaya provider tercatat terpisah.",
    steps: [
      "Sekali di awal: tekan \"Kelola Harga Provider & Margin\" untuk mengisi biaya modal dan margin setiap produk.",
      "Isi form transaksi: kategori, produk (harga & margin terisi otomatis), nominal, nomor tujuan/referensi, akun sumber dana, dan akun penerima.",
      "Tarik Tunai: arah uangnya terbalik — pelanggan menerima uang tunai dari laci, saldo deposit provider yang bertambah.",
      "Salah input? Tekan Batalkan (void). Edit dan hapus permanen hanya untuk Superuser.",
      "Kartu di atas menampilkan saldo deposit PPOB dan jumlah transaksi periode ini.",
    ],
    notes: [
      "Saldo deposit PPOB ikut dicek setiap tutup shift, karena dipakai bersama semua kasir.",
      "Kalau outlet tidak menjual PPOB, Superuser bisa mematikan modul ini — riwayat lama tetap aman.",
    ],
    roles: "Owner, Superuser, Manager (sesuai izin kelola PPOB).",
  },
  {
    id: "marketplace",
    group: "penjualan",
    label: "Marketplace Antar-Outlet (Jual Beli Barang Bekas)",
    summary:
      "Jual stik, konsol, TV, kursi, atau perlengkapan yang tidak terpakai kepada outlet NEXBILL lain — atau beli barang bekas dari mereka. Gratis, tanpa biaya jasa. Dilengkapi profil kepercayaan, rekening terkunci, bukti transaksi, ulasan, dan saluran aduan.",
    subsections: [
      {
        title: "Sebelum mulai — Keamanan & Rekening",
        steps: [
          "Buka tab Keamanan & Rekening. Isi rekening penerima pembayaran (bank/e-wallet, nomor, nama pemilik sesuai buku tabungan).",
          "Pembeli hanya diarahkan membayar ke rekening ini. Kalau rekening diganti, pembeli melihat peringatan selama 7 hari.",
          "Lihat profil kepercayaan outletmu: umur akun, transaksi selesai, ulasan, dan aduan — beginilah outlet lain melihatmu.",
        ],
      },
      {
        title: "Menjual barang",
        steps: [
          "Tab Barang Saya → Pasang Barang: isi nama barang (mis. \"Stik PS4 DualShock, bekas mulus\"), kategori, harga per unit, jumlah unit, dan deskripsi jujur (kondisi, kelengkapan, alasan dijual).",
          "Tambahkan sampai 5 foto — barang dengan foto jauh lebih dipercaya dan cepat laku.",
          "Isi nomor HP yang bisa dihubungi. Nomor ini tidak tampil di etalase — baru dibuka ke pembeli setelah kamu menerima penawarannya.",
          "Tekan Pasang di Etalase.",
          "Menarik barang dari etalase wajib memilih alasannya.",
        ],
      },
      {
        title: "Membeli barang",
        steps: [
          "Lihat etalase, cari atau saring per kategori, klik barang untuk melihat foto dan profil kepercayaan penjual.",
          "Tekan Ajukan Beli: isi harga tawaran per unit, catatan untuk penjual, dan nomor HP-mu, lalu Kirim Penawaran.",
        ],
      },
      {
        title: "Kesepakatan & serah terima",
        steps: [
          "Penjual menerima penawaran di tab Kesepakatan — nomor HP kedua pihak langsung terbuka untuk mengatur serah terima.",
          "Pembeli membayar HANYA ke rekening yang tertera di kartu kesepakatan, lalu mengunggah bukti bayar. Penjual mengunggah bukti serah terima/resi.",
          "Penjual: serahkan barang setelah dana benar-benar masuk — cek mutasi rekening, jangan hanya percaya foto bukti transfer.",
          "Pembeli menekan \"Barang Diterima & Sudah Dibayar\" setelah barang diterima. Setelah itu kedua pihak bisa saling memberi ulasan bintang.",
        ],
      },
      {
        title: "Kalau ada masalah",
        steps: [
          "Tekan Laporkan Masalah di kartu kesepakatan: pilih jenis masalah, tulis kronologi (apa yang disepakati, tanggal, nominal), dan lampirkan bukti.",
          "Pihak yang dilaporkan bisa memberi tanggapan dan buktinya sendiri. Tim NEXBILL memutuskan setelah membaca kedua sisi.",
          "Aduan palsu dapat berbalik menjadi sanksi bagi pelapor.",
        ],
      },
    ],
    notes: [
      "Tips aman: cek profil lawan, utamakan COD atau bayar setelah barang terlihat, transfer hanya ke rekening di kartu kesepakatan, unggah bukti di aplikasi.",
      "Jangan menulis nomor HP, rekening lain, atau tautan di deskripsi, chat alasan, atau ulasan — sistem menyaringnya supaya transaksi tetap terlindungi bukti di aplikasi.",
      "Outlet yang baru bergabung punya batas nilai barang yang boleh dipasang sampai reputasinya terbentuk.",
      "Penjualan otomatis tercatat sebagai pendapatan penjual di pembukuan.",
    ],
  },
  {
    id: "chat",
    group: "penjualan",
    label: "Customer Service (Tanya Tim NEXBILL)",
    navHint: "Ini saluran bantuan ke tim pusat NEXBILL — bukan kotak pesan pelanggan outletmu.",
    summary: "Kirim pertanyaan, keluhan, saran, atau kendala teknis langsung ke tim NEXBILL, lengkap dengan foto/video.",
    steps: [
      "Tekan \"+ Tiket Baru\", isi judul (opsional), kategori (Keluhan/Saran/Kendala Teknis/Lainnya), dan pesan, lalu Kirim ke Pusat.",
      "Lampirkan foto atau video layar kalau ada error — jauh lebih cepat dipahami.",
      "Pilih tiket di daftar kiri untuk membaca percakapannya, balas di kotak \"Balas...\".",
      "Permintaan token NexbillAgent (kontrol Android TV) juga dibalas lewat sini.",
    ],
    notes: [
      "Balasan muncul otomatis tanpa perlu refresh.",
      "Tim NEXBILL membalas dalam bahasa sesuai Negara outletmu (Pengaturan → Business & Tax).",
      "Status tiket (selesai/dibuka) diatur oleh tim NEXBILL.",
    ],
  },
  {
    id: "notifikasi",
    group: "penjualan",
    label: "Notifikasi & Pengumuman",
    navHint: "Ikon lonceng di bagian atas layar.",
    summary:
      "Semua hal yang butuh perhatianmu di satu tempat: stok menipis, permintaan persetujuan, pengeluaran tertunda, booking, status langganan, dan pengumuman dari tim NEXBILL.",
    steps: [
      "Tekan ikon lonceng. Angka merah menunjukkan notifikasi yang belum dibaca.",
      "Pilih Semua atau Belum Dibaca.",
      "Klik judul notifikasi untuk langsung membuka halaman terkait (otomatis ditandai dibaca), atau tekan \"Tandai dibaca\".",
      "\"Tandai semua dibaca\" untuk membersihkan semuanya.",
    ],
    notes: [
      "Jenis notifikasi yang ditampilkan bisa diatur di Pengaturan → Notifikasi.",
      "Pengumuman penting dari tim NEXBILL juga tampil sebagai pop-up sekali saat membuka dashboard sampai kamu menekan \"Mengerti\".",
    ],
  },
];
