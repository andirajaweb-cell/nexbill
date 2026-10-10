import type { PageGuideBook } from "./page-guides";

export const PAGE_GUIDES_MS: PageGuideBook = {
  ui: {"guidePrefix": "Panduan", "open": "Buka", "close": "Tutup", "steps": "Langkah", "tips": "Perhatikan"},
  pages: {
    rental: {
      summary: "Skrin utama sewaan PS: mulakan sesi, pantau masa, tambah F&B ke bil, kemudian terima bayaran.",
      steps: [
        "Di panel Quick Start, pilih unit yang tersedia, tetapkan tempoh (atau main terbuka) atau pilih pakej promo, kemudian mulakan sesi.",
        "Semasa bermain, tambah makanan/minuman atau aksesori ke bil, dan lanjutkan masa jika pelanggan minta.",
        "Klik End Session & Bayar, kemudian pilih kaedah bayaran. Satu bil boleh dibayar dengan beberapa kaedah (split).",
        "Jika pelanggan bayar kemudian, tutup tetingkap bayaran — bil masih boleh dijelaskan di Juruwang (POS).",
      ],
      tips: [
        "Unit berkadar sifar akan dicaj sifar. Tetapkan dahulu melalui butang Tetapkan Kadar Semua Unit.",
        "TV atau palam pintar hidup dan mati sendiri mengikut sesi jika unit sudah disambung di Kawalan Peranti.",
        "Tandakan unit yang rosak atau diservis dengan Set Maintenance supaya tidak digunakan dan tidak muncul dalam tempahan dalam talian.",
      ],
    },
    pos: {
      summary: "Jual makanan, minuman dan produk lain. Bil sewaan yang belum dibayar juga dijelaskan di sini.",
      steps: [
        "Cari produk mengikut nama atau imbas kod bar (kamera telefon pun boleh), kemudian ketik produk untuk masuk ke troli.",
        "Isi diskaun atau kod baucar jika ada, kemudian pilih kaedah bayaran.",
        "Klik Bayar, kemudian Cetak Resit jika pelanggan mahu.",
        "Order Terbuka mengandungi bil yang belum dibayar, termasuk sesi sewaan yang ditutup dengan \"bayar kemudian\".",
      ],
      tips: [
        "Belum ada menu? Guna Tambah Menu Pantas (nama + harga). Stok, harga kos dan kod bar boleh dilengkapkan kemudian di Inventori.",
        "Untuk banyak produk sekali gus, guna Import Produk dari Excel di Inventori.",
        "Bayaran QRIS dan pindahan bank masuk ke QRIS dan akaun bank milik outlet anda sendiri, yang ditetapkan di menu Pembayaran.",
      ],
    },
    booking: {
      summary: "Rekod tempahan dari telefon/WhatsApp, terima tempahan dalam talian, dan daftar masuk pelanggan apabila tiba.",
      steps: [
        "Kongsi pautan tempahan dalam talian melalui butang Kongsi Pautan Tempahan supaya pelanggan boleh menempah sendiri.",
        "Untuk pesanan telefon/WA, isi Tempahan Baru (nama, No. telefon, unit atau \"mana-mana unit\", masa, deposit pilihan), atau klik slot kosong di Peta Tempahan.",
        "Apabila pelanggan tiba, taip kod tempahannya (cth. BK-00001) di Cari & Daftar Masuk.",
        "Sahkan, pindah unit, batalkan atau tandakan no-show dari butiran tempahan.",
      ],
      tips: [
        "Jadual yang bertindih masuk senarai menunggu secara automatik dan naik sendiri apabila slot kosong.",
        "Tempahan yang belum daftar masuk dilepaskan secara automatik selepas had masa di Tetapan.",
        "Penerimaan tempahan dalam talian boleh dihentikan sementara di Tetapan jika outlet penuh.",
      ],
    },
    inventory: {
      summary: "Senarai produk dan stok. Jualan, pembelian dan pelarasan stok direkod ke perakaunan secara automatik.",
      steps: [
        "Tambah produk di tab Produk (nama, kategori, harga jual, stok awal), atau Import Produk dari Excel untuk banyak produk sekali gus.",
        "Rekod pembelian daripada pembekal di tab Belanja Supplier — stok bertambah dan harga kos dikemas kini.",
        "Isi Stok Minimum untuk amaran stok rendah. Jika produk ada Pembekal Utama, draf Purchase Order dicipta secara automatik.",
        "Kira stok fizikal secara berkala melalui tab Stock Opname.",
      ],
      tips: [
        "Makanan yang dimasak dibuat melalui tab Resep / BOM, jadi stok bahan mentahnya yang berkurang apabila dijual.",
        "Hidupkan \"Hantar ke Kitchen Display\" hanya untuk produk yang dibuat dapur, bukan produk bungkusan sedia jual.",
        "Barang rosak atau tamat tempoh direkod melalui Pelarasan dengan sebab Rosak / Waste, bukan dengan memadam produk.",
      ],
    },
    membership: {
      summary: "Data pelanggan, mata ganjaran dan kad ahli supaya pelanggan datang semula.",
      steps: [
        "Di tab Membership Tier, cipta tier percuma (naik sendiri dari jumlah belanja) atau berbayar (kad ahli yang dijual di juruwang).",
        "Isi faedah automatik, iaitu diskaun kadar main (%) dan pengganda mata. Sistem memotongnya sendiri.",
        "Di tab Customer, tambah pelanggan kemudian pilih namanya untuk melihat sejarah, menjual atau memperbaharui kad ahli, dan menebus mata.",
        "Isi tab Reward supaya mata boleh ditebus, dan tab Voucher untuk kod diskaun.",
      ],
      tips: [
        "Faedah manual (main percuma, F&B percuma, dll.) hanya dipaparkan sebagai peringatan di skrin juruwang; juruwang yang memberikannya.",
        "Mata bertambah bagi setiap transaksi yang selesai atas nama pelanggan, jadi pilih pelanggan semasa transaksi.",
        "Pelanggan boleh diberi QR Kad Ahli, jadi juruwang hanya perlu imbas QR itu di Rental PS.",
      ],
    },
    promo: {
      summary: "Pakej harga tetap untuk tempoh tertentu, contohnya 3 jam PS4 dengan harga istimewa.",
      steps: [
        "Isi nama pakej, pilih konsol (atau semua konsol), tempoh dalam minit dan harga pakej.",
        "Pilihan: tambah bundel makanan/minuman. Item bundel masuk ke bil dengan harga sifar apabila pakej digunakan.",
        "Simpan. Juruwang boleh terus memilih pakej semasa memulakan sesi di Rental PS.",
      ],
      tips: [
        "Contoh pakej: \"Pakej Malam 3 Jam\" (180 minit) atau \"Main 2 Jam + Teh Ais\".",
        "Pakej juga digunakan oleh ejen AI semasa membalas chat pelanggan.",
        "Pakej yang tidak ditawarkan lagi cukup dinyahaktifkan supaya sejarahnya tetap tersimpan.",
      ],
    },
    reports: {
      summary: "Laporan operasi mengikut tempoh. Pilih tempoh, kemudian buka tab yang anda perlukan.",
      steps: [
        "Pilih tempoh di bahagian atas tab (cth. hari ini, bulan ini atau tarikh sendiri); laporan terus dimuat semula.",
        "Jualan: jumlah pendapatan, trend harian dan pendapatan mengikut kaedah bayaran.",
        "Rental: bilangan sesi, purata tempoh dan pendapatan setiap unit PS untuk melihat unit paling laris.",
        "Inventori & HPP untuk margin setiap produk dan stok rendah; Pelanggan untuk pelanggan teratas; Beban untuk perbelanjaan mengikut kategori.",
      ],
      tips: [
        "Untuk semakan harian, cukup lihat jumlah pendapatan, pendapatan setiap unit PS dan stok rendah.",
        "Angka untung rasmi ada di Perakaunan › Untung Rugi. Tab Jualan menunjukkan cara memadankan kedua-duanya.",
        "Tab Kesihatan Kewangan memaparkan margin, kecairan dan pencapaian sasaran pulang modal outlet.",
      ],
    },
  },
};
