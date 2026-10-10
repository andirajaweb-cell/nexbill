/**
 * Panduan singkat yang bisa dibuka-tutup di menu harian (Rental PS, Kasir, Booking, Inventory,
 * Membership, Promo, Laporan) — pola yang sama dengan panduan per tab Akuntansi. File ini SUMBER
 * (Bahasa Indonesia); terjemahan ada di page-guides.<lang>.ts dengan struktur yang sama persis
 * (dijaga page-guides.test.ts) dan dipilih lewat getPageGuideBook(lang) di page-guides-book.ts.
 */

export type PageGuideKey = "rental" | "pos" | "booking" | "inventory" | "membership" | "promo" | "reports";

export interface PageGuideContent {
  summary: string;
  steps: string[];
  tips: string[];
}

export interface PageGuideUi {
  guidePrefix: string;
  open: string;
  close: string;
  steps: string;
  tips: string;
}

export interface PageGuideBook {
  ui: PageGuideUi;
  pages: Record<PageGuideKey, PageGuideContent>;
}

export const PAGE_GUIDES_ID: PageGuideBook = {
  ui: {"guidePrefix": "Panduan", "open": "Buka", "close": "Tutup", "steps": "Langkah", "tips": "Perhatikan"},
  pages: {
    rental: {
      summary: "Layar utama untuk sewa PS: mulai sesi, pantau waktu, tambah F&B ke bill, lalu bayar.",
      steps: [
        "Di panel Quick Start, pilih unit yang tersedia, tentukan durasi (atau main terbuka) atau pilih paket promo, lalu mulai sesi.",
        "Selama main, tambahkan makanan/minuman atau aksesoris ke bill, dan perpanjang waktu bila pelanggan minta.",
        "Klik End Session & Bayar, lalu pilih metode pembayaran. Satu tagihan bisa dibayar dengan beberapa metode (split).",
        "Kalau pelanggan bayar belakangan, tutup jendela bayar — tagihannya tetap bisa dilunasi di Kasir (POS).",
      ],
      tips: [
        "Unit bertarif Rp0 akan tertagih Rp0. Atur dulu lewat tombol Atur Tarif Semua Unit.",
        "TV atau smart plug menyala dan mati sendiri mengikuti sesi bila unit sudah dihubungkan di Kontrol Perangkat.",
        "Unit yang sedang rusak atau diservis tandai Set Maintenance supaya tidak dipakai dan tidak muncul di booking online.",
      ],
    },
    pos: {
      summary: "Jual makanan, minuman, dan produk lain. Tagihan rental yang belum dibayar juga dilunasi di sini.",
      steps: [
        "Cari produk dengan nama atau scan barcode (bisa pakai kamera HP), lalu ketuk produknya untuk masuk keranjang.",
        "Isi diskon atau kode voucher bila ada, lalu pilih metode pembayaran.",
        "Klik Bayar, lalu Cetak Struk bila pelanggan minta.",
        "Order Terbuka berisi tagihan yang belum dibayar, termasuk sesi rental yang ditutup dengan \"bayar nanti\".",
      ],
      tips: [
        "Menu belum ada? Pakai Tambah Menu Cepat (nama + harga). Stok, harga modal, dan barcode bisa dilengkapi nanti di Inventory.",
        "Untuk banyak produk sekaligus, pakai Import Produk dari Excel di Inventory.",
        "Pembayaran QRIS dan transfer masuk ke QRIS dan rekening milik outlet Anda sendiri, yang diatur di menu Pembayaran.",
      ],
    },
    booking: {
      summary: "Catat reservasi dari telepon/WhatsApp, terima booking online, dan check-in pelanggan saat datang.",
      steps: [
        "Bagikan link booking online lewat tombol Bagikan Link Booking supaya pelanggan bisa memesan sendiri.",
        "Untuk pesanan lewat telepon/WA, isi Booking Baru (nama, No. HP, unit atau \"unit apa saja\", jam, DP opsional), atau klik slot kosong di Map Booking.",
        "Saat pelanggan datang, ketik kode bookingnya (mis. BK-00001) di Cari & Check-in.",
        "Konfirmasi, pindah unit, batalkan, atau tandai no-show dari detail booking.",
      ],
      tips: [
        "Jadwal yang bentrok otomatis masuk waiting list dan naik sendiri saat slotnya kosong.",
        "Booking yang belum check-in dilepas otomatis setelah batas waktu yang diatur di Pengaturan.",
        "Penerimaan booking online bisa dimatikan sementara di Pengaturan bila outlet sedang penuh.",
      ],
    },
    inventory: {
      summary: "Daftar produk dan stok. Penjualan, belanja, dan penyesuaian stok tercatat otomatis ke akuntansi.",
      steps: [
        "Tambah produk di tab Produk (nama, kategori, harga jual, stok awal), atau Import Produk dari Excel untuk banyak produk sekaligus.",
        "Catat belanja ke supplier di tab Belanja Supplier — stok bertambah dan harga modal ikut diperbarui.",
        "Isi Minimum Stok supaya ada peringatan stok menipis. Bila produk punya Supplier Utama, draft Purchase Order dibuat otomatis.",
        "Hitung stok fisik secara berkala lewat tab Stock Opname.",
      ],
      tips: [
        "Makanan olahan dibuat lewat tab Resep / BOM, sehingga stok bahan bakunya yang berkurang saat terjual.",
        "Nyalakan \"Kirim ke Kitchen Display\" hanya untuk produk yang dibuat dapur, bukan produk kemasan siap jual.",
        "Barang rusak atau kedaluwarsa dicatat lewat Penyesuaian dengan alasan Rusak / Waste, bukan dengan menghapus produk.",
      ],
    },
    membership: {
      summary: "Data pelanggan, poin loyalty, dan kartu member supaya pelanggan datang lagi.",
      steps: [
        "Di tab Membership Tier, buat tier gratis (naik sendiri dari total belanja) atau berbayar (kartu member yang dijual di kasir).",
        "Isi keuntungan otomatis, yaitu diskon tarif main (%) dan pengali poin. Sistem memotongnya sendiri.",
        "Di tab Customer, tambah pelanggan lalu pilih namanya untuk melihat riwayat, menjual atau memperpanjang kartu member, dan menukar poin.",
        "Isi tab Reward supaya poin bisa ditukar, dan tab Voucher untuk kode potongan.",
      ],
      tips: [
        "Keuntungan manual (gratis main, gratis F&B, dll.) hanya tampil sebagai pengingat di layar kasir; kasir yang memberikannya.",
        "Poin bertambah setiap transaksi yang selesai atas nama pelanggan, jadi pilih pelanggannya saat transaksi.",
        "Pelanggan bisa diberi QR Kartu Member, sehingga kasir cukup scan QR itu di Rental PS.",
      ],
    },
    promo: {
      summary: "Paket harga tetap untuk durasi tertentu, misalnya 3 jam PS4 dengan harga khusus.",
      steps: [
        "Isi nama paket, pilih konsol (atau semua konsol), durasi dalam menit, dan harga paket.",
        "Opsional: tambahkan bundel makanan/minuman. Item bundel otomatis masuk bill dengan harga Rp0 saat paket dipakai.",
        "Simpan. Paket langsung bisa dipilih kasir saat memulai sesi di Rental PS.",
      ],
      tips: [
        "Contoh paket: \"Paket Malam 3 Jam\" (180 menit) atau \"Main 2 Jam + Es Teh\".",
        "Paket juga dipakai AI agent saat menjawab chat pelanggan.",
        "Paket yang sudah tidak berlaku cukup dinonaktifkan supaya riwayatnya tetap tersimpan.",
      ],
    },
    reports: {
      summary: "Laporan operasional per periode. Pilih periode, lalu buka tab yang Anda perlukan.",
      steps: [
        "Pilih periode di bagian atas tab (mis. hari ini, bulan ini, atau tanggal sendiri); laporan langsung dimuat ulang.",
        "Penjualan: total pendapatan, tren harian, dan pendapatan per metode pembayaran.",
        "Rental: jumlah sesi, rata-rata durasi, dan pendapatan per unit PS untuk melihat unit yang paling laku.",
        "Inventori & HPP untuk margin per produk dan stok menipis; Pelanggan untuk pelanggan teratas; Beban untuk pengeluaran per kategori.",
      ],
      tips: [
        "Untuk pengecekan harian, cukup lihat total pendapatan, pendapatan per unit PS, dan stok menipis.",
        "Angka resmi laba ada di Akuntansi › Laba Rugi. Tab Penjualan menampilkan cara mencocokkan keduanya.",
        "Tab Kesehatan Keuangan menampilkan margin, likuiditas, dan pencapaian target BEP outlet.",
      ],
    },
  },
};
