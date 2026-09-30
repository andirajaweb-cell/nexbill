import type { HelpCategory } from "../../types";

export const PERAN: HelpCategory[] = [
  {
    id: "peran-kasir",
    group: "peran",
    label: "Saya Kasir — Tugas Harian",
    summary:
      "Daftar kerja kasir dari buka toko sampai pulang, dalam urutan yang dipakai sehari-hari. Kalau kamu kasir baru, cukup kuasai topik ini dulu.",
    roles: "Peran Cashier (Kasir). Supervisor, Manager, dan Owner juga bisa mengerjakan semua langkah ini.",
    subsections: [
      {
        title: "Saat datang (buka toko)",
        steps: [
          "Login dengan akunmu sendiri — jangan memakai akun teman.",
          "Buka menu Shift & Kasir → Buka Shift Baru. Hitung dulu uang yang benar-benar ada di laci, lalu isi angka itu sebagai Modal Awal. Kalau angkanya berbeda dari uang yang ditinggal shift sebelumnya, tulis alasannya.",
          "Nyalakan dan cek semua unit PS, stik, dan TV. Unit yang rusak jangan disewakan — laporkan ke atasan supaya dibuatkan tiket Maintenance.",
          "Buka menu Booking untuk melihat pesanan hari ini, supaya unit yang sudah dipesan tidak diberikan ke pelanggan lain.",
          "Cek ikon lonceng (Notifikasi) untuk stok menipis atau pesan penting.",
        ],
      },
      {
        title: "Melayani pelanggan main di tempat",
        steps: [
          "Pelanggan datang tanpa booking → Rental PS → pilih unit kosong → pilih paket/per jam → isi nama → Mulai Sesi.",
          "Pelanggan dengan booking → ketik kode booking di Booking → Check-in.",
          "Pesan makanan/minuman saat bermain → tekan +F&B di kartu sesinya, bukan lewat Kasir, supaya masuk satu tagihan.",
          "Pelanggan minta tambah waktu → Add Time. Perhatikan alarm saat sisa waktu tinggal 5 menit dan tawarkan perpanjangan.",
          "Selesai → End Session & Bayar → pilih metode → Bayar → Cetak Struk.",
        ],
      },
      {
        title: "Menjual makanan/minuman tanpa sewa",
        steps: [
          "Buka Kasir (POS), klik produk atau scan barcode, atur jumlah, pilih metode bayar, tekan Bayar.",
          "Tunai: terima uang, tekan \"Konfirmasi Cash Diterima\". QRIS/transfer: tunjukkan QRIS/rekening outlet yang tampil di layar, tunggu uang masuk, lalu tandai diterima.",
        ],
      },
      {
        title: "Uang keluar kecil selama jaga",
        steps: [
          "Bayar parkir, beli galon, dll → catat saat itu juga di Expense Management → Cash Out Cepat. Jangan ditunda, supaya kas shift tidak selisih.",
          "Uang diambil owner / disetor ke brankas → catat sebagai Setoran Kas di halaman Shift & Kasir.",
        ],
      },
      {
        title: "Sebelum pulang (tutup shift)",
        steps: [
          "Pastikan tidak ada sesi yang masih berjalan untuk pelanggan yang sudah pulang — akhiri dan selesaikan pembayarannya (atau simpan sebagai bayar nanti).",
          "Buka Shift & Kasir → Tutup Shift. Hitung uang di laci per pecahan (Rp100.000, Rp50.000, dst.) tanpa melihat angka sistem.",
          "Buka aplikasi setiap e-wallet/rekening yang dipakai hari itu dan isi saldonya di bagian Verifikasi Saldo Non-Tunai.",
          "Isi berapa uang yang ditinggal di laci untuk shift berikutnya, dan berapa yang diserahkan ke owner/brankas.",
          "Tekan Tutup Shift. Kalau ada selisih, tulis dugaan penyebabnya di catatan.",
          "Matikan TV/unit yang tidak dipakai, rapikan stik, dan serahkan informasi penting ke shift berikutnya.",
        ],
      },
    ],
    notes: [
      "Salah input? Jangan panik. Pembatalan (void/refund) bisa diajukan dan disetujui atasan — data tidak hilang, hanya dibatalkan.",
      "Kasir tidak bisa memberi diskon manual melebihi batas yang diatur owner (Pengaturan → Preferensi). Diskon di atas batas butuh Supervisor ke atas.",
      "Jangan pernah membagikan password akunmu. Semua transaksi tercatat atas nama akun yang login.",
    ],
  },
  {
    id: "peran-owner",
    group: "peran",
    label: "Saya Owner / Manager — Memantau Usaha",
    summary:
      "Apa yang sebaiknya dicek pemilik atau manajer setiap hari, setiap minggu, dan setiap bulan — supaya usaha terpantau tanpa harus selalu ada di outlet.",
    roles: "Owner, Manager, dan Superuser. Sebagian menu keuangan hanya bisa diubah Owner/Accountant/Superuser (Manager bisa melihat).",
    subsections: [
      {
        title: "Setiap hari (5 menit dari HP)",
        steps: [
          "Buka Dashboard Ringkasan: pendapatan hari ini, laba kotor, unit yang sedang main, saldo kas, dan progres target harian.",
          "Cek Notifikasi: pengeluaran yang menunggu persetujuanmu, permintaan void/refund, stok menipis.",
          "Setujui atau tolak permintaan di Staf & Hak Akses → Approval dan di Expense Management (status Pending Approval).",
          "Buka Shift & Kasir → Riwayat Shift: lihat shift yang selisihnya merah atau ditandai untuk ditinjau.",
        ],
      },
      {
        title: "Setiap minggu",
        steps: [
          "Laporan → Penjualan & Rental: unit mana paling laku dan metode bayar yang paling dipakai. Grafik Jam Ramai vs Jam Sepi di Dashboard Ringkasan membantu mengatur jadwal staf dan promo jam sepi.",
          "Transaksi → Performa Kasir: bandingkan penjualan, void, diskon, dan selisih kas tiap kasir.",
          "Inventory → Purchase Order: cek produk yang perlu dibeli ulang.",
          "Maintenance: pastikan tiket perbaikan tidak menumpuk. Pakai Dokter Stik untuk memeriksa stik yang dikeluhkan pelanggan.",
        ],
      },
      {
        title: "Setiap bulan",
        steps: [
          "Aset → Penyusutan: jalankan penyusutan bulan itu.",
          "Expense → Recurring: buat pengeluaran rutin (listrik, internet, sewa tempat, gaji) yang jatuh tempo.",
          "Accounting → Laba Rugi dan Neraca: lihat untung/rugi bulan ini, bandingkan dengan bulan lalu. Laporan → Kesehatan Keuangan untuk ringkasan yang lebih mudah dibaca.",
          "Accounting → Audit: jalankan pemeriksaan pembukuan otomatis dan ikuti saran perbaikannya.",
          "Setelah laporan bulan itu final, kunci bulannya di Accounting → Tutup Periode supaya angkanya tidak berubah lagi.",
          "Cek tagihan langganan NEXBILL di menu Langganan supaya layanan tidak terhenti.",
        ],
      },
      {
        title: "Mengatur aturan main outlet",
        steps: [
          "Pengaturan → Business & Tax: pajak, service charge, pembulatan tagihan, target penjualan, batas persetujuan pengeluaran.",
          "Pengaturan → Preferensi: batas diskon manual kasir, ambang selisih kas yang ditandai, akun kas yang dijumlahkan sebagai modal shift.",
          "Staf & Hak Akses: tambah/nonaktifkan staf, keluarkan akun yang masih login di perangkat lain.",
        ],
      },
    ],
    notes: [
      "Tanyakan apa saja tentang usahamu ke AI Business Intelligence (khusus Owner/Superuser), mis. \"unit PS mana yang paling menguntungkan bulan ini?\".",
      "Punya beberapa cabang? Menu Semua Outlet menampilkan omzet semua cabang dalam satu layar.",
    ],
  },
  {
    id: "peran-dapur",
    group: "peran",
    label: "Saya Staf Dapur — Kitchen Display",
    summary: "Cara staf dapur menerima dan menyelesaikan pesanan makanan/minuman tanpa kertas pesanan.",
    roles: "Peran Kitchen (Dapur). Semua staf yang login juga bisa membuka Kitchen Display.",
    steps: [
      "Login dengan akun dapur, buka menu Kitchen Display. Biarkan halaman ini terbuka di tablet/monitor dapur sepanjang jam kerja.",
      "Tekan tombol 🔊 supaya alarm pesanan berbunyi, dan \"Aktifkan Notifikasi Browser\" supaya pesanan baru tetap muncul walau layar sedang di aplikasi lain.",
      "Pesanan baru muncul di kolom Baru dengan bunyi. Tekan Konfirmasi saat mulai kamu tangani.",
      "Tekan Mulai Masak saat mulai dibuat, lalu Siap Diantar saat selesai — pelayan/kasir mendapat bunyi \"Makanan Siap\".",
      "Setelah diantar ke pelanggan, tekan Sudah Diantar. Pesanan hilang dari papan.",
      "Bahan habis? Di kolom Baru tekan Batal dan pilih alasannya (mis. \"Bahan habis\") — kasir akan tahu dan tagihan pelanggan menyesuaikan.",
    ],
    notes: [
      "Papan menyegarkan diri otomatis setiap beberapa detik — tidak perlu ditekan refresh.",
      "Stok bahan berkurang otomatis sesuai resep saat menu terjual. Kalau stok bahan sering tidak cocok, minta owner mengecek resep di Inventory → Resep / BOM.",
    ],
  },
  {
    id: "peran-akuntan",
    group: "peran",
    label: "Saya Akuntan — Pembukuan & Laporan",
    summary:
      "Tugas rutin akuntan/admin keuangan di NEXBILL: memastikan semua pengeluaran, pembelian, dan penyesuaian tercatat benar, lalu menyiapkan laporan bulanan.",
    roles: "Peran Accountant, Owner, dan Superuser (yang bisa mengubah data akuntansi). Manager hanya bisa melihat.",
    steps: [
      "Harian/mingguan: periksa Expense Management — lengkapi lampiran bukti, bayar pengeluaran yang dicatat sebagai hutang, batalkan (void) yang salah.",
      "Periksa Accounting → Hutang (AP) dan Piutang (AR): bayar hutang supplier yang jatuh tempo, catat pelunasan piutang pelanggan.",
      "Cocokkan saldo rekening bank dengan mutasi bank. Pakai Accounting → Rekonsiliasi untuk menemukan transaksi yang tanggal pencatatannya berbeda.",
      "Akhir bulan: jalankan Penyusutan aset, buat pengeluaran rutin (Recurring), lalu cek Neraca Saldo harus seimbang.",
      "Jalankan Accounting → Audit dan selesaikan temuan (mis. produk tanpa harga modal, jurnal ganda).",
      "Ekspor Laba Rugi, Neraca, dan Arus Kas (Excel/PDF). Isi Catatan atas Laporan Keuangan di tab CALK bila diperlukan.",
      "Tutup periode bulan itu di Accounting → Tutup Periode setelah laporan disetujui owner.",
    ],
    notes: [
      "Transaksi otomatis (penjualan, expense, dll) tidak bisa diubah langsung di jurnal — koreksinya lewat menu asalnya (mis. refund di Transaksi, void di Expense). Ini menjaga jejak audit tetap utuh.",
      "Kalau perlu koreksi setelah periode ditutup, catat koreksinya di periode berjalan, jangan membuka periode lama kecuali benar-benar perlu.",
    ],
  },
];
