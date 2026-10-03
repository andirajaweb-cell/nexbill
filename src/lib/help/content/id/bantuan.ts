import type { HelpCategory } from "../../types";

export const BANTUAN: HelpCategory[] = [
  {
    id: "masalah-umum",
    group: "bantuan",
    label: "Masalah Umum & Solusinya",
    summary:
      "Kumpulan kendala yang paling sering dialami outlet beserta langkah mengatasinya. Coba langkah-langkah ini dulu sebelum menghubungi Customer Service.",
    subsections: [
      {
        title: "Tidak bisa login",
        steps: [
          "\"Akun sedang aktif di perangkat lain\": logout dulu dari perangkat sebelumnya, tunggu 30 menit, atau minta Owner menekan \"Keluarkan\" di Staf & Hak Akses.",
          "Lupa password: tekan \"Lupa password\" di halaman login dan buka tautan di email (cek juga folder Spam).",
          "Akun dinonaktifkan: minta Owner/Manager mengaktifkannya kembali.",
        ],
      },
      {
        title: "TV tidak menyala/mati otomatis",
        steps: [
          "Cek status perangkat di Kontrol Perangkat. Kalau offline: pastikan PC kasir yang menjalankan NexbillAgent menyala dan terhubung internet.",
          "Android TV: pastikan TV dan PC kasir di jaringan WiFi yang sama dan IP TV tidak berubah (kunci IP sesuai Panduan NexbillAgent). Lihat 28 masalah umum (kode P01–P28) di Panduan Lengkap NexbillAgent.",
          "Smart plug Tuya tiba-tiba tidak merespons semua: kemungkinan langganan Trial Tuya Cloud habis — perpanjang di iot.tuya.com. Kalau outlet punya beberapa akun Tuya, cek Pengaturan → Integrasi Tuya Cloud API: akun yang berstatus \"Tidak terhubung\" adalah yang perlu diperpanjang.",
          "TV bukan Android: harus memakai smart plug. Tekan \"Lihat Rekomendasi Smart Plug\" di Kontrol Perangkat.",
          "Sementara belum beres, nyalakan TV manual dengan remote — sesi rental tetap berjalan normal.",
        ],
      },
      {
        title: "Stik tidak terbaca di Gamepad Tester",
        steps: [
          "Pakai Chrome atau Edge, colokkan stik, lalu tekan sembarang tombol sekali.",
          "Stik PS3 di Windows butuh driver DsHidMini (tombol unduh ada di halaman Gamepad Tester). Stik PS3 tiruan sering tetap tidak terbaca.",
          "Coba kabel USB lain — banyak kabel murah hanya untuk mengisi daya, bukan data.",
        ],
      },
      {
        title: "Selisih kas saat tutup shift",
        steps: [
          "Cek pengeluaran kecil yang belum dicatat (parkir, galon) — catat lewat Expense → Cash Out Cepat.",
          "Cek uang yang diambil owner/disetor tapi belum dicatat sebagai Setoran Kas.",
          "Cek transaksi yang seharusnya QRIS/transfer tapi tercatat tunai (atau sebaliknya) di menu Transaksi.",
          "Cek kembalian yang salah dan transaksi \"bayar nanti\" yang ternyata dibayar tunai.",
          "Tulis dugaan penyebab di catatan shift supaya owner bisa menindaklanjuti.",
        ],
      },
      {
        title: "Lupa menutup shift / shift tidak bisa dibuka",
        steps: [
          "Hanya satu shift yang boleh terbuka per outlet (kecuali diizinkan di Preferensi). Kalau kasir sebelumnya lupa menutup, atasan bisa menutup shift itu: hitung uang di laci dan tulis alasannya.",
          "Setelah itu buka shift baru seperti biasa.",
        ],
      },
      {
        title: "Stok minus atau tidak cocok",
        steps: [
          "Stok pembelian harus dicatat lewat Belanja Supplier/Purchase Order, bukan hanya diletakkan di rak.",
          "Menu olahan: pastikan resepnya benar — stok bahan yang berkurang, bukan stok menu.",
          "Lakukan Stock Opname untuk menyamakan stok sistem dengan stok fisik.",
        ],
      },
      {
        title: "Laba terlihat terlalu besar",
        steps: [
          "Kemungkinan besar ada produk yang Harga Modal-nya kosong. Isi Harga Modal di Inventory → Produk; halaman Laba Rugi juga menampilkan peringatannya.",
          "Pastikan pengeluaran rutin (listrik, gaji, sewa) sudah dicatat dan penyusutan aset sudah dijalankan bulan itu.",
        ],
      },
      {
        title: "Struk tidak tercetak / terpotong",
        steps: [
          "Pastikan printer menyala, kertas terpasang, dan printer terpilih di dialog cetak browser.",
          "Atur lebar kertas (58mm/80mm) di Pengaturan → Business & Tax → Printer lalu \"Simpan untuk Komputer Ini\".",
          "Printer Bluetooth di HP: nyalakan Bluetooth & printer, cek Cara cetak di Pengaturan → Printer, lalu \"Tes Cetak\". Kalau printer tidak muncul saat \"Pilih Printer Bluetooth\", printernya Bluetooth Classic — pilih mode \"Lewat aplikasi RawBT\". iPhone belum didukung.",
        ],
      },
      {
        title: "Pembayaran QRIS belum terkonfirmasi",
        steps: [
          "Cek aplikasi bank/QRIS outlet — pastikan dana benar-benar masuk (jangan hanya melihat foto bukti transfer dari pelanggan).",
          "Setelah dana masuk, tekan \"Tandai Diterima\" dan isi nomor referensinya.",
        ],
      },
      {
        title: "Tombol yang dicari tidak ada",
        steps: [
          "Kemungkinan peranmu tidak punya izin. Tombol hapus permanen, tukar poin, dan pengaturan izin hanya untuk Superuser.",
          "Modul mungkin dimatikan — cek Pengaturan → Feature Management (Superuser).",
          "Masih bingung? Kirim tangkapan layar lewat Customer Service.",
        ],
      },
      {
        title: "Tidak bisa mencatat jurnal di bulan lalu",
        steps: [
          "Bulan itu sudah ditutup di Accounting → Tutup Periode. Catat koreksinya dengan tanggal hari ini, atau minta Owner/Accountant membuka kembali periode bila benar-benar perlu.",
        ],
      },
    ],
    notes: ["Kendala belum teratasi? Buka Customer Service, jelaskan langkah yang sudah dicoba, dan lampirkan foto/video layar."],
  },
  {
    id: "kamus-istilah",
    group: "bantuan",
    label: "Kamus Istilah",
    summary: "Arti singkat istilah yang sering muncul di NEXBILL, dalam bahasa sehari-hari.",
    subsections: [
      {
        title: "Operasional",
        steps: [
          "Sesi — satu kali sewa main di satu unit, dari Mulai sampai End Session.",
          "Unit / Station / Bilik — satu set PlayStation + TV yang disewakan.",
          "Paket — harga tetap untuk durasi tertentu (mis. 3 jam Rp45.000).",
          "Add Time — menambah waktu main pada sesi yang sedang berjalan.",
          "DP (uang muka) — pembayaran sebagian di awal.",
          "Booking / Reservasi — pesanan unit untuk jam tertentu. Waiting List = antrean kalau jadwal bentrok. No-show = pelanggan tidak datang.",
          "F&B — food & beverage, makanan dan minuman.",
          "KDS / Kitchen Display — layar pesanan dapur.",
          "Split payment — satu tagihan dibayar dengan lebih dari satu metode.",
          "Void — membatalkan transaksi yang keliru. Refund — mengembalikan uang pelanggan.",
        ],
      },
      {
        title: "Kasir & shift",
        steps: [
          "Shift — masa kerja satu kasir memegang laci uang.",
          "Modal awal — uang di laci saat shift dibuka.",
          "Ekspektasi kas — uang yang seharusnya ada di laci menurut catatan transaksi.",
          "Selisih — hasil hitungan fisik dikurangi ekspektasi kas. Minus = uang kurang.",
          "Setoran kas — uang dari laci diserahkan ke owner/brankas/bank.",
          "Pindah kas — memindahkan uang antar tempat kas.",
          "Saldo terlacak — saldo e-wallet/deposit yang dicek setiap tutup shift.",
        ],
      },
      {
        title: "Stok",
        steps: [
          "SKU — kode unik produk.",
          "Harga Modal / HPP — biaya untuk mendapatkan satu produk yang terjual.",
          "Resep / BOM — daftar bahan untuk membuat satu menu.",
          "PO (Purchase Order) — pesanan pembelian ke supplier.",
          "Stock opname — menghitung stok fisik lalu menyamakan dengan sistem.",
          "Waste — barang rusak/terbuang.",
          "Rata-rata tertimbang / FIFO — cara menghitung harga modal saat harga beli berubah-ubah.",
        ],
      },
      {
        title: "Keuangan & akuntansi",
        steps: [
          "Jurnal — catatan pembukuan setiap transaksi (debit dan kredit).",
          "COA (Chart of Accounts) — daftar akun pembukuan, mis. Kas, Pendapatan Rental, Beban Listrik.",
          "Piutang (AR) — uang yang masih harus dibayar pelanggan kepada outlet.",
          "Hutang (AP) — uang yang masih harus dibayar outlet kepada supplier.",
          "Laba Rugi — pendapatan dikurangi biaya dalam satu periode.",
          "Neraca — posisi harta, hutang, dan modal pada satu tanggal.",
          "Arus Kas — uang yang benar-benar masuk dan keluar.",
          "Saldo awal — posisi keuangan saat mulai memakai NEXBILL.",
          "Tutup periode — mengunci satu bulan supaya laporannya tidak berubah lagi.",
          "BEP / target penjualan — omzet minimal agar usaha tidak rugi.",
          "Cost center — kelompok biaya per bagian usaha.",
        ],
      },
      {
        title: "Aset",
        steps: [
          "Aset tetap — barang modal yang dipakai lebih dari setahun (PS, TV, kursi).",
          "Harga perolehan — harga beli aset termasuk ongkos kirim/pasang.",
          "Umur ekonomis — perkiraan lama aset dipakai (bulan).",
          "Nilai sisa — perkiraan harga jual aset saat umur ekonomis habis.",
          "Penyusutan — pengurangan nilai aset setiap bulan karena dipakai.",
          "Nilai buku — harga perolehan dikurangi total penyusutan.",
          "Pelepasan (disposal) — aset dijual, rusak total, atau hilang.",
        ],
      },
      {
        title: "Perangkat & sistem",
        steps: [
          "NexbillAgent — aplikasi kecil di PC kasir untuk mengontrol Android TV.",
          "Smart plug — colokan pintar yang menyalakan/mematikan listrik TV dari jauh.",
          "Relay Agent / token — penghubung dan kunci rahasia antara NEXBILL dan NexbillAgent.",
          "TV Screensaver — tampilan promosi di TV Android saat unit tidak dipakai.",
          "Drift — analog stik bergerak sendiri walau tidak disentuh.",
          "Superuser — akun tertinggi yang bisa mengatur semua hal, termasuk izin peran.",
          "Feature Management — tempat menyalakan/mematikan modul tambahan.",
        ],
      },
    ],
  },
];
