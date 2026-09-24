/**
 * Aritmetika dan aturan alur Marketplace Antar-Outlet — MURNI, tanpa import database.
 *
 * Dipisah supaya halaman "use client" bisa menampilkan ujrah dan tombol-tombol yang tersedia
 * dengan rumus yang SAMA PERSIS dengan yang dipakai server saat menyimpan, dan supaya aturan
 * akadnya bisa diuji tanpa Postgres. Pola yang sama dipakai charge.ts, product-lang.ts, dan
 * tier-benefits.ts di proyek ini.
 */

export type DealStatus = "requested" | "accepted" | "completed" | "rejected" | "cancelled";
export type ListingStatus = "active" | "reserved" | "sold" | "closed";

/**
 * Ujrah baku NEXBILL: nominal TETAP per transaksi sukses, tidak peduli harga barangnya.
 *
 * KENAPA TETAP, BUKAN PERSEN. Yang dijual NEXBILL di sini adalah JASA mempertemukan dua outlet
 * dan mencatat kesepakatannya. Usaha jasa itu sama saja untuk kabel Rp20.000 maupun konsol
 * Rp3.000.000, jadi upah yang tetap justru lebih mencerminkan jasanya daripada persentase. Secara
 * fikih ini akad ijarah/ju'alah dengan ujrah ma'lumah — upah yang besarannya diketahui pasti di
 * muka, sehingga tidak ada gharar pada nominal yang belum pasti. Pemilik memilih bentuk ini
 * secara eksplisit (23 September 2026).
 *
 * Bisa ditimpa lewat env tanpa deploy ulang kode, misalnya untuk masa promosi.
 */
export const UJRAH_DEFAULT = 5000;

/** Batas bawah harga yang dibebaskan ujrah — barang yang lebih murah dari ujrahnya sendiri tidak masuk akal ditagih. */
export const UJRAH_HARGA_MINIMUM = 20000;

export interface UjrahConfig {
  /** Nominal tetap per transaksi sukses. */
  nominal: number;
  /** Transaksi di bawah nilai ini dibebaskan ujrah sepenuhnya. */
  hargaMinimum: number;
}

export const UJRAH_CONFIG_DEFAULT: UjrahConfig = { nominal: UJRAH_DEFAULT, hargaMinimum: UJRAH_HARGA_MINIMUM };

/**
 * SAKLAR ARSIP UJRAH — keputusan pemilik 2026-09-24: Marketplace Antar-Outlet GRATIS untuk
 * sementara. Seluruh mekanisme ujrah (perhitungan, penyalinan ke kesepakatan, faktur
 * "marketplace_fee" di billing.ts, tampilan di layar) SENGAJA dipertahankan utuh dan hanya
 * dimatikan lewat saklar ini, supaya mengaktifkannya lagi cukup satu baris: ubah ke `true`.
 *
 * Selama `false`:
 *   - kesepakatan baru tercatat dengan platform_fee_amount = 0 (lihat ujrahConfigBerlaku);
 *   - bebankanUjrah() membebaskan (waived) kesepakatan lama yang sempat tercatat ber-ujrah,
 *     sehingga tidak ada satu pun faktur marketplace_fee yang terbit;
 *   - layar menampilkan "Gratis" dan menyembunyikan semua angka & klausul ujrah;
 *   - variabel lingkungan MARKETPLACE_UJRAH diabaikan.
 *
 * Saat mengaktifkan kembali, umumkan dulu ke merchant — ujrah adalah akad yang harus diketahui
 * di muka (ma'lumah), tidak boleh berlaku diam-diam atas penawaran yang sudah berjalan.
 */
export const UJRAH_AKTIF: boolean = false;

export const UJRAH_CONFIG_NONAKTIF: UjrahConfig = { nominal: 0, hargaMinimum: 0 };

/** Konfigurasi yang benar-benar berlaku sekarang (tanpa env) — dipakai layar. Server memakai ujrahConfig() di service.ts. */
export function ujrahConfigBerlaku(): UjrahConfig {
  return UJRAH_AKTIF ? UJRAH_CONFIG_DEFAULT : UJRAH_CONFIG_NONAKTIF;
}

/**
 * Menghitung ujrah untuk satu kesepakatan.
 *
 * Dua pembebasan yang disengaja:
 *
 *  - Nilai transaksi di bawah `hargaMinimum` → gratis. Menagih Rp5.000 atas penjualan kabel
 *    Rp15.000 berarti memotong sepertiga hasil penjualan penjual; itu bukan upah jasa yang wajar,
 *    dan akan membuat barang-barang kecil justru tidak pernah didaftarkan.
 *
 *  - Ujrah tidak pernah melebihi nilai transaksinya sendiri. Pengaman terhadap salah konfigurasi:
 *    upah yang lebih besar dari nilai yang diurus bukan lagi upah jasa.
 */
export function computeUjrah(agreedPrice: number, qty = 1, config: UjrahConfig = UJRAH_CONFIG_DEFAULT): number {
  const nilai = Math.round(Math.max(0, agreedPrice) * Math.max(1, Math.floor(qty)));
  if (nilai < config.hargaMinimum) return 0;
  return Math.min(Math.round(Math.max(0, config.nominal)), nilai);
}

/** Total yang dibayar pembeli KE PENJUAL — ujrah sengaja tidak ikut, karena ditagih terpisah ke penjual lewat fakturnya sendiri. */
export function totalDibayarPembeli(agreedPrice: number, qty = 1): number {
  return Math.round(Math.max(0, agreedPrice) * Math.max(1, Math.floor(qty)));
}

/** Yang benar-benar diterima penjual setelah ujrah — dipakai layar supaya penjual melihat angka bersihnya sebelum menyetujui. */
export function bersihUntukPenjual(agreedPrice: number, qty = 1, config: UjrahConfig = UJRAH_CONFIG_DEFAULT): number {
  return totalDibayarPembeli(agreedPrice, qty) - computeUjrah(agreedPrice, qty, config);
}

/**
 * Alur status kesepakatan. Peta ini adalah SATU-SATUNYA definisi transisi yang sah — API dan layar
 * sama-sama membacanya, jadi tombol yang tampil di layar tidak mungkin berbeda dari yang diterima
 * server.
 *
 *   requested --terima--> accepted --selesai--> completed
 *   requested --tolak---> rejected
 *   requested/accepted --batal--> cancelled
 *
 * completed/rejected/cancelled adalah akhir: tidak ada jalan keluar dari ketiganya. Kesepakatan
 * yang sudah selesai sudah terlanjur memunculkan jurnal pendapatan di sisi penjual dan ujrah yang
 * tertagih; membukanya kembali berarti membatalkan keduanya diam-diam.
 */
export const TRANSISI_SAH: Record<DealStatus, DealStatus[]> = {
  requested: ["accepted", "rejected", "cancelled"],
  accepted: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

export function bolehPindahStatus(dari: DealStatus, ke: DealStatus): boolean {
  return (TRANSISI_SAH[dari] ?? []).includes(ke);
}

/**
 * Siapa yang boleh melakukan transisi apa.
 *
 * Pembagiannya mengikuti siapa yang memegang barang dan siapa yang memegang uang: PENJUAL yang
 * menerima atau menolak permintaan (barangnya miliknya), PEMBELI yang menyatakan kesepakatan
 * selesai (dialah yang tahu barangnya sudah diterima dan uangnya sudah dibayar). Membiarkan
 * penjual sendiri yang menyatakan selesai berarti penjual bisa memunculkan jurnal pendapatan atas
 * barang yang belum tentu dikirim.
 *
 * Pembatalan bisa dari kedua sisi selama belum selesai — kesepakatan yang batal di dunia nyata
 * tidak boleh tersangkut di aplikasi hanya karena pihak yang berwenang membatalkannya sedang tidak
 * membuka NEXBILL.
 */
export type PeranDeal = "seller" | "buyer";

export function bolehDilakukanOleh(peran: PeranDeal, ke: DealStatus): boolean {
  if (ke === "accepted" || ke === "rejected") return peran === "seller";
  if (ke === "completed") return peran === "buyer";
  if (ke === "cancelled") return true;
  return false;
}

/** Status listing yang seharusnya mengikuti status kesepakatan terakhirnya — dipakai service supaya barang yang sudah laku tidak tetap tampil "tersedia". */
export function statusListingSetelah(deal: DealStatus): ListingStatus | null {
  if (deal === "accepted") return "reserved";
  if (deal === "completed") return "sold";
  if (deal === "rejected" || deal === "cancelled") return "active"; // dikembalikan ke etalase
  return null;
}

export const KATEGORI_LABEL: Record<string, string> = {
  controller: "Stik / Controller",
  console: "Konsol",
  cable: "Kabel & Adaptor",
  tv: "TV / Monitor",
  furniture: "Kursi & Meja",
  accessory: "Aksesoris Lain",
  other: "Lain-lain",
};

export const KONDISI_LABEL: Record<string, string> = {
  new: "Baru",
  like_new: "Seperti Baru",
  used: "Bekas Layak Pakai",
  needs_repair: "Perlu Perbaikan",
};

export const STATUS_DEAL_LABEL: Record<DealStatus, string> = {
  requested: "Menunggu Penjual",
  accepted: "Disetujui — Menunggu Barang Diterima",
  completed: "Selesai",
  rejected: "Ditolak Penjual",
  cancelled: "Dibatalkan",
};
