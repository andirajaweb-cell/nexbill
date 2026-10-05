import type { HelpCategory } from "../../types";

export const INVENTORI: HelpCategory[] = [
  {
    id: "inventory",
    group: "inventori",
    label: "Inventory Control (Produk, Resep, Supplier, Stok)",
    summary:
      "Kelola produk yang dijual, resep menu olahan, supplier, belanja stok, pesanan pembelian (PO), dan hitung stok fisik (stock opname). Semua perubahan stok dan harga modal otomatis masuk pembukuan.",
    subsections: [
      {
        title: "Produk",
        steps: [
          "Tambah manual: nama, kategori, harga jual, Harga Modal, stok awal, satuan, stok minimum, dan supplier utama (opsional).",
          "Barcode: isi saat menambah/edit produk — ketik, tembak dengan scanner USB/Bluetooth, atau tekan ikon kamera untuk scan dari HP/laptop. Satu barcode hanya untuk satu produk aktif. Barcode yang sama langsung terbaca di Kasir. Tombol Scan kamera di atas daftar produk mencari produk dari barcodenya; kalau belum terdaftar, barcode diisikan ke form Tambah Produk Baru. Tombol scan juga ada di Resep/BOM, Belanja Supplier, dan Purchase Order untuk memilih produk.",
          "Tambah banyak sekaligus: unduh template Excel, isi, lalu upload. Baris dengan SKU yang sudah ada akan memperbarui produk itu (stok tidak ikut berubah lewat upload).",
          "Kategori produk dan satuan (pcs, gram, dll) diatur di Pengaturan → Kategori Produk dan Pengaturan → Satuan.",
          "Mengubah stok tanpa pembelian (rusak, hilang, salah hitung): pakai Penyesuaian Barang — Tambah, Kurangi (alasan Selisih atau Rusak/Waste), atau Set ke jumlah tertentu.",
          "Stok yang dibeli dari supplier jangan lewat Penyesuaian Barang — pakai Belanja Supplier atau Purchase Order, supaya Harga Modal ikut terhitung.",
        ],
        notes: [
          "Harga Modal wajib diisi. Tanpa itu, laporan menganggap penjualan produk untung penuh dan Laba Rugi menjadi terlalu tinggi.",
          "Hapus produk (hanya Superuser) tidak menghapus riwayat penjualannya.",
        ],
      },
      {
        title: "Resep / BOM (menu olahan)",
        steps: [
          "Pilih membuat produk baru atau memakai produk makanan yang sudah ada.",
          "Isi nama resep dan hasil (berapa porsi per satu kali masak), lalu tambahkan bahan: produk bahan baku, jumlah, dan satuannya.",
          "Simpan. Harga modal per porsi dihitung otomatis dari bahan. Setiap kali menu terjual, stok BAHAN yang berkurang.",
        ],
        notes: ["Satu produk hanya boleh punya satu resep."],
      },
      {
        title: "Supplier",
        steps: [
          "Tambah supplier: nama, telepon, alamat, dan termin pembayaran (hari).",
          "Supplier yang sudah punya transaksi tidak bisa dihapus — arsipkan saja supaya tidak muncul di pilihan baru, riwayatnya tetap utuh.",
        ],
      },
      {
        title: "Belanja Supplier (beli stok langsung)",
        steps: [
          "Pilih supplier, masukkan produk, jumlah, dan harga beli.",
          "Tambahkan biaya transport/parkir/lain-lain bila ada — dibagi otomatis ke setiap produk sehingga Harga Modal mencerminkan biaya sebenarnya.",
          "Centang \"Dibayar cash sekarang\" kalau lunas; biarkan kosong kalau dicatat sebagai hutang ke supplier.",
          "Metode harga modal (Rata-rata tertimbang atau FIFO — masuk pertama, keluar pertama) dipilih di tab ini. Kalau ragu, pakai Rata-rata tertimbang (bawaan). LIFO tidak tersedia karena tidak diperbolehkan standar akuntansi dan pajak Indonesia.",
        ],
      },
      {
        title: "Purchase Order (pesanan ke supplier)",
        steps: [
          "\"Produk Perlu Restock\" menampilkan produk yang stoknya sudah di bawah minimum — tekan \"+ Isi ke form PO\".",
          "\"Cek & Buat PO Otomatis\" membuat draf PO untuk semua produk di bawah minimum yang punya supplier utama. Draf tetap perlu dicek dan dikirim manual.",
          "Buat PO manual: pilih supplier, isi produk, jumlah, dan harga, tekan Buat PO.",
          "Saat barang datang, tekan Terima Barang: stok bertambah, dan tagihan (hutang) ke supplier dibuat otomatis.",
        ],
      },
      {
        title: "Stock Opname (hitung stok fisik)",
        steps: [
          "Hitung stok di rak/gudang, isi hasilnya di samping angka sistem — selisih langsung terlihat. Simpan sebagai draf.",
          "Scan untuk hitung: tekan \"Scan untuk hitung\" (kamera) atau tembak scanner ke kotak cari — setiap scan menambah hitungan produk itu 1. Angka tetap bisa dikoreksi manual.",
          "Buka draf untuk memeriksa selisih per produk.",
          "Tekan Terapkan Penyesuaian: kelebihan dicatat sebagai penyesuaian, kekurangan sebagai waste. Tidak bisa diterapkan dua kali.",
        ],
      },
    ],
    notes: ["Kebanyakan aksi di halaman ini (upload, tambah produk/resep, PO, opname) hanya untuk Owner dan Manager."],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "assets",
    group: "inventori",
    label: "Aset Tetap (Unit PS, TV, Stik, Mebel)",
    summary:
      "Daftar barang modal outlet (PlayStation, TV, stik, mebel, kendaraan) beserta penyusutan otomatis setiap bulan, pembelian aset, perbaikan, dan pelepasan (dijual/rusak/hilang). Daftar bisa difilter, diunduh ke Excel, dan diisi lewat upload Excel.",
    subsections: [
      {
        title: "Daftar Aset — melihat & memfilter",
        steps: [
          "Cari berdasarkan nama, catatan, atau nama unit PS. Saring menurut kategori, status (Aktif, Maintenance, Dilepas, atau semua kecuali dilepas), terhubung ke unit PS atau tidak, dan rentang tanggal perolehan.",
          "Di bawah filter tampil jumlah aset yang cocok beserta total harga perolehan, akumulasi penyusutan, dan nilai buku.",
          "Tekan Download Excel untuk mengunduh daftar sesuai filter yang sedang aktif (lengkap dengan baris TOTAL).",
        ],
      },
      {
        title: "Menambah aset",
        steps: [
          "Satu aset: tekan \"+ Aset Baru\" — isi nama, kategori, unit PS terkait (opsional), harga perolehan, nilai sisa, umur pakai (bulan), supplier, dan cara bayar (kas/bank atau dicatat hutang).",
          "Beberapa aset sekaligus, ongkos kirim/pasang, uang muka, atau aset yang sudah dimiliki sebelumnya: pakai tab Pembelian Aset.",
          "Banyak aset dari Excel: tekan Upload Excel → unduh template → isi → pilih cara pencatatan (Saldo awal untuk aset yang sudah dimiliki, Dibayar dari kas/bank, atau Dicatat sebagai hutang) → Periksa File → Simpan.",
          "Saat upload, file diperiksa dulu: baris yang salah ditampilkan beserta alasannya, dan tidak ada yang tersimpan sampai semua baris benar. Baris dengan tanggal yang sama menjadi satu dokumen Pembelian Aset.",
        ],
        notes: [
          "Nilai sisa = perkiraan harga jual saat umur pakai habis. Umur pakai contoh: PS 36 bulan, TV 60 bulan, stik 12 bulan.",
          "Salah upload? Batalkan dokumennya dari tab Pembelian Aset (selama asetnya belum disusutkan atau dilepas).",
        ],
      },
      {
        title: "Pembelian Aset",
        steps: [
          "Satu dokumen pembelian bisa berisi beberapa barang. Qty 3 otomatis menjadi 3 aset bernomor (#1, #2, #3).",
          "Ongkos kirim/pemasangan ikut dibagi ke harga perolehan setiap barang.",
          "Pilihan pembayaran: lunas, hutang, uang muka (DP), atau saldo awal. Hutang pembelian aset muncul di Accounting → Hutang dan bisa dicicil.",
          "Pembelian bisa dibatalkan selama belum ada aset di dalamnya yang disusutkan atau dilepas.",
        ],
      },
      {
        title: "Perbaikan & pelepasan",
        steps: [
          "+ Maintenance pada aset aktif: isi deskripsi dan biaya, centang \"Buat Expense\" supaya biayanya tercatat sebagai pengeluaran.",
          "Lepas Aset (dijual, rusak total, hilang): isi hasil penjualan (0 kalau tidak ada), akun kas/bank penerima, dan alasan. Untung/rugi pelepasan dihitung otomatis.",
        ],
      },
      {
        title: "Penyusutan (setiap bulan)",
        steps: [
          "Buka tab Penyusutan, pilih bulan, lihat perkiraan totalnya, lalu tekan Jalankan Penyusutan.",
          "Aman ditekan berkali-kali: bulan yang sudah diproses atau aset yang sudah habis nilainya otomatis dilewati.",
          "Riwayat Penyusutan menampilkan semua penyusutan yang sudah dicatat.",
        ],
      },
    ],
    roles: "Melihat & mengunduh: semua staf yang membuka halaman ini. Menambah, upload, perbaikan, pelepasan, penyusutan: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "maintenance",
    group: "inventori",
    label: "Maintenance (Tiket Perbaikan)",
    summary:
      "Catat perbaikan TV, konsol, stik, dan perlengkapan lain dari masuk bengkel sampai selesai, supaya tidak ada kerusakan yang terlupa dan biaya perbaikan tercatat.",
    subsections: [
      {
        title: "Membuat & memproses tiket",
        steps: [
          "Tekan \"+ Tambah Maintenance\": pilih aset, tulis kerusakannya dan biayanya, centang \"Buat Expense\" kalau biaya perlu dicatat sebagai pengeluaran.",
          "Tiket baru berstatus \"Masuk Maintenance\" dan asetnya otomatis ditandai Maintenance.",
          "Tekan \"Mulai Proses\" saat mulai diperbaiki, lalu \"Tandai Selesai\" saat beres — aset kembali Aktif kalau tidak ada tiket lain yang terbuka.",
          "Tiket bisa diedit kapan saja. Biaya terkunci kalau sudah dibuatkan expense (ubah lewat menu Expense). Tiket yang sudah dibuatkan expense tidak bisa dihapus.",
        ],
      },
      {
        title: "Ringkasan per kategori",
        steps: ["Kartu di atas menunjukkan per kategori (PlayStation, TV, Controller, dll): unit tersedia dibanding total, dan yang sedang diperbaiki."],
      },
    ],
    notes: [
      "Tidak yakin stiknya rusak atau tidak? Periksa dulu dengan Dokter Stik (Gamepad Tester) — ada tautannya di halaman ini.",
    ],
    roles: "Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "dokter-stik",
    group: "inventori",
    label: "Dokter Stik (Gamepad Tester) & Driver Stik PS3",
    navHint: "Maintenance → Gamepad Tester",
    summary:
      "Periksa stik PS3, PS4, dan PS5 langsung dari browser: tombol yang mati, analog yang bergeser sendiri (drift), keseimbangan analog, dan tekanan trigger — hasilnya skor kesehatan, analisis kerusakan, dan saran servis.",
    subsections: [
      {
        title: "Memeriksa stik",
        steps: [
          "Buka halaman ini di Google Chrome atau Microsoft Edge di PC/laptop.",
          "Colokkan stik lewat kabel USB (PS4/PS5 juga bisa lewat Bluetooth), lalu tekan sembarang tombol sekali — browser baru mendeteksi stik setelah ada tombol ditekan.",
          "Terdengar nada naik = stik terhubung, nada turun = stik terputus. Suara bisa dimatikan dengan tombol \"Suara: Aktif\". Kalau tidak berbunyi, klik sekali di halaman dulu (aturan browser).",
          "Tekan semua tombol dan gerakkan kedua analog: indikator menyala sesuai tombol yang ditekan.",
          "Di bagian \"Pemeriksaan terpandu (Dokter Stik)\" tekan Mulai Pemeriksaan, lalu ikuti instruksi di layar: letakkan stik di meja tanpa disentuh selama hitungan, putar kedua analog penuh, dan tarik L2/R2 perlahan sampai mentok. Di akhir muncul skor kesehatan, daftar temuan, kemungkinan penyebab, dan rekomendasi — bisa dicetak atau disimpan sebagai PDF.",
        ],
      },
      {
        title: "Stik PS3 tidak terdeteksi di Windows",
        steps: [
          "Ini bukan kerusakan stik: Windows tidak punya driver bawaan untuk stik PS3, sehingga tombolnya tidak diteruskan ke browser.",
          "Unduh driver DsHidMini dari tombol di halaman ini, pasang, lalu colokkan ulang stik.",
          "Driver hanya dijamin untuk stik PS3 ORIGINAL Sony. Banyak stik PS3 tiruan (KW) yang tetap tidak terbaca walau driver sudah terpasang.",
          "Tanpa memasang driver: buka halaman ini di Chrome HP Android dan colokkan stik PS3 dengan kabel OTG.",
        ],
      },
    ],
    notes: [
      "Hasil dibaca langsung dari perangkat keras stik, bukan simulasi.",
      "Alat ini tidak membaca gyro/adaptive trigger DualSense dan tidak mengatur getaran — khusus fungsi tombol dan analog.",
      "Stik yang hasilnya buruk: buat tiket di Maintenance supaya tercatat dan tidak disewakan ke pelanggan.",
    ],
  },
];
