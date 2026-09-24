/**
 * Keamanan sesama outlet di Marketplace Antar-Outlet — aturan murni (tanpa db), dipakai server
 * untuk menegakkan dan layar untuk menampilkan. Diuji di trust.test.ts.
 *
 * Titik berangkatnya: NEXBILL TIDAK memegang uang (tidak ada escrow — lihat db/schema.ts). Jadi
 * perlindungan yang bisa diberikan bukan "uang ditahan sampai barang sampai", melainkan:
 *   1. KENALI lawan transaksi — profil kepercayaan dari data yang tidak bisa dipalsukan penjual
 *      sendiri (umur akun, transaksi selesai, rating dari outlet lain, aduan terbukti).
 *   2. BATASI risiko pada outlet baru — nilai barang dibatasi sampai reputasinya terbentuk.
 *   3. SATU rekening yang sah — rekening dikunci ke kesepakatan saat diterima, sehingga modus
 *      "rekening ganti, transfer ke sini saja" langsung ketahuan.
 *   4. BUKTI tercatat — bukti bayar & bukti serah-terima diunggah di aplikasi, bukan di chat.
 *   5. JALUR ADUAN — diputuskan platform-admin, dengan sanksi yang terlihat di profil.
 */

import type { DealStatus } from "./ujrah";

const HARI_MS = 24 * 60 * 60 * 1000;

/* ================= PROFIL KEPERCAYAAN ================= */

export type LevelKepercayaan = "suspended" | "caution" | "new" | "active" | "trusted";

export interface DataKepercayaan {
  /** outlets.created_at */
  joinedAt: string;
  /** Kesepakatan berstatus completed, sebagai penjual MAUPUN pembeli. */
  completedDeals: number;
  ratingSum: number;
  ratingCount: number;
  /** Aduan terhadap outlet ini yang diputus "warning" atau "suspended". */
  provenDisputes: number;
  /** Aduan terhadap outlet ini yang masih terbuka. */
  openDisputesAgainst: number;
  suspended: boolean;
  /** Langganan NEXBILL masih berjalan (trial/active/grace/free_forever). */
  subscriptionActive: boolean;
}

export interface ProfilKepercayaan {
  level: LevelKepercayaan;
  label: string;
  /** Umur akun dalam hari (dibulatkan ke bawah). */
  ageDays: number;
  completedDeals: number;
  avgRating: number | null;
  ratingCount: number;
  provenDisputes: number;
  openDisputesAgainst: number;
  isNew: boolean;
  subscriptionActive: boolean;
  /** Kalimat peringatan untuk pihak lawan, kosong bila tidak ada. */
  peringatan: string[];
}

export const AMBANG = {
  /**
   * Outlet dianggap baru bila akun NEXBILL-nya berumur di bawah ini. Sengaja HANYA umur akun, bukan
   * jumlah transaksi Marketplace: fitur ini baru diluncurkan, jadi semua outlet — termasuk yang
   * sudah berlangganan bertahun-tahun — mulai dari nol transaksi. Membatasi mereka semua sama saja
   * dengan menutup barang bernilai besar di seluruh marketplace. Kurangnya riwayat transaksi tetap
   * ditampilkan sebagai peringatan, dan label "Terpercaya" tetap mensyaratkan transaksi selesai.
   */
  HARI_OUTLET_BARU: 30,
  /** Syarat label "Terpercaya". */
  HARI_TERPERCAYA: 90,
  TRANSAKSI_TERPERCAYA: 5,
  RATING_TERPERCAYA: 4.5,
  /** Rata-rata rating di bawah ini (dengan ≥ 3 ulasan) → "Perlu Hati-hati". */
  RATING_WASPADA: 3.5,
  /** Nilai maksimum satu barang (harga × jumlah) yang boleh dipasang outlet baru. */
  NILAI_MAKS_OUTLET_BARU: 2_000_000,
  /** Rekening yang diganti dalam kurun ini diberi peringatan ke pembeli. */
  HARI_REKENING_BARU: 7,
} as const;

export function hitungProfilKepercayaan(d: DataKepercayaan, now: Date = new Date()): ProfilKepercayaan {
  const ageDays = Math.max(0, Math.floor((now.getTime() - new Date(d.joinedAt).getTime()) / HARI_MS));
  const avgRating = d.ratingCount > 0 ? Math.round((d.ratingSum / d.ratingCount) * 10) / 10 : null;
  const isNew = ageDays < AMBANG.HARI_OUTLET_BARU;

  const peringatan: string[] = [];
  if (d.provenDisputes > 0) peringatan.push(`Pernah terbukti bermasalah dalam ${d.provenDisputes} aduan.`);
  if (d.openDisputesAgainst > 0) peringatan.push(`Sedang menghadapi ${d.openDisputesAgainst} aduan yang belum diputuskan.`);
  if (avgRating !== null && d.ratingCount >= 3 && avgRating < AMBANG.RATING_WASPADA) peringatan.push(`Rating rendah (${avgRating} dari ${d.ratingCount} ulasan).`);
  if (!d.subscriptionActive) peringatan.push("Langganan NEXBILL outlet ini tidak aktif.");
  if (isNew) peringatan.push(`Akun NEXBILL baru (${ageDays} hari) — belum punya riwayat.`);
  else if (d.completedDeals === 0) peringatan.push("Belum punya riwayat transaksi Marketplace yang selesai.");

  let level: LevelKepercayaan;
  if (d.suspended) level = "suspended";
  else if (d.provenDisputes > 0 || d.openDisputesAgainst >= 2 || (avgRating !== null && d.ratingCount >= 3 && avgRating < AMBANG.RATING_WASPADA)) level = "caution";
  else if (isNew) level = "new";
  else if (
    ageDays >= AMBANG.HARI_TERPERCAYA &&
    d.completedDeals >= AMBANG.TRANSAKSI_TERPERCAYA &&
    (avgRating === null || avgRating >= AMBANG.RATING_TERPERCAYA) &&
    d.openDisputesAgainst === 0 &&
    d.subscriptionActive
  )
    level = "trusted";
  else level = "active";

  return {
    level,
    label: LABEL_LEVEL[level],
    ageDays,
    completedDeals: d.completedDeals,
    avgRating,
    ratingCount: d.ratingCount,
    provenDisputes: d.provenDisputes,
    openDisputesAgainst: d.openDisputesAgainst,
    isNew,
    subscriptionActive: d.subscriptionActive,
    peringatan,
  };
}

export const LABEL_LEVEL: Record<LevelKepercayaan, string> = {
  suspended: "Ditangguhkan",
  caution: "Perlu Hati-hati",
  new: "Outlet Baru",
  active: "Aktif",
  trusted: "Terpercaya",
};

/**
 * Batas nilai satu barang. Outlet baru dibatasi supaya penipu yang baru mendaftar tidak bisa
 * langsung memasang barang mahal (mis. konsol PS5) dan menghilang setelah ditransfer — pola paling
 * merugikan di marketplace tanpa escrow. Batas terangkat otomatis setelah reputasi terbentuk.
 */
export function periksaBatasNilaiBarang(profil: Pick<ProfilKepercayaan, "isNew" | "level">, price: number, qty: number): void {
  if (profil.level === "suspended") throw new Error("Akses Marketplace outlet Anda sedang ditangguhkan. Hubungi Customer Service.");
  const nilai = Math.round(price) * Math.max(1, Math.floor(qty));
  if (profil.isNew && nilai > AMBANG.NILAI_MAKS_OUTLET_BARU) {
    throw new Error(
      `Outlet yang baru bergabung dapat memasang barang bernilai maksimal Rp${AMBANG.NILAI_MAKS_OUTLET_BARU.toLocaleString("id-ID")} (harga × jumlah). ` +
        `Batas ini terbuka otomatis setelah akun NEXBILL outlet berumur ${AMBANG.HARI_OUTLET_BARU} hari.`
    );
  }
}

/* ================= REKENING PENERIMA ================= */

export interface Rekening {
  bankName: string;
  accountNumber: string;
  holder: string;
}

export function validasiRekening(input: Partial<Record<keyof Rekening, unknown>>): Rekening {
  const bankName = String(input.bankName ?? "").trim();
  const accountNumber = String(input.accountNumber ?? "").replace(/[\s.-]/g, "");
  const holder = String(input.holder ?? "").trim().replace(/\s+/g, " ");
  if (bankName.length < 2) throw new Error("Nama bank / e-wallet wajib diisi.");
  if (!/^\d{6,20}$/.test(accountNumber)) throw new Error("Nomor rekening harus 6–20 digit angka.");
  if (holder.length < 3) throw new Error("Nama pemilik rekening wajib diisi sesuai buku tabungan.");
  return { bankName, accountNumber, holder };
}

/** Rekening diganti baru-baru ini → pembeli diberi peringatan. */
export function rekeningBaruDiganti(bankUpdatedAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!bankUpdatedAt) return false;
  return now.getTime() - new Date(bankUpdatedAt).getTime() < AMBANG.HARI_REKENING_BARU * HARI_MS;
}

/** Nomor rekening disamarkan untuk tampilan yang bukan pihak transaksi (mis. profil). */
export function samarkanRekening(no: string): string {
  return no.length <= 4 ? no : `${"•".repeat(Math.max(0, no.length - 4))}${no.slice(-4)}`;
}

/* ================= BUKTI, ULASAN, ADUAN ================= */

/** Bukti bayar/serah-terima hanya relevan pada kesepakatan yang sudah diterima dan belum ditutup. */
export function bolehUnggahBukti(status: DealStatus): boolean {
  return status === "accepted" || status === "completed";
}

export function bolehUlas(status: DealStatus): boolean {
  return status === "completed";
}

export function validasiRating(x: unknown): number {
  const n = Number(x);
  if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error("Rating harus 1 sampai 5 bintang.");
  return n;
}

/**
 * Aduan boleh diajukan setelah penawaran DITERIMA — sebelum itu belum ada kewajiban apa pun di
 * antara kedua pihak. Kesepakatan yang dibatalkan tetap boleh diadukan: penipu yang sudah menerima
 * transfer lalu menekan "Batalkan" adalah persis kasus yang harus bisa dilaporkan.
 */
export function bolehAdukan(status: DealStatus): boolean {
  return status === "accepted" || status === "completed" || status === "cancelled";
}

export const KATEGORI_ADUAN = {
  not_delivered: "Sudah bayar, barang tidak diserahkan / tidak dikirim",
  not_as_described: "Barang tidak sesuai foto atau keterangan",
  payment_not_received: "Barang sudah diserahkan, pembayaran belum diterima",
  fake_proof: "Bukti transfer atau bukti kirim palsu",
  wrong_account: "Diminta transfer ke rekening lain / di luar yang terdaftar",
  unresponsive: "Tidak bisa dihubungi setelah kesepakatan",
  other: "Lainnya",
} as const;
export type KategoriAduan = keyof typeof KATEGORI_ADUAN;

export function kategoriAduanSah(x: unknown): x is KategoriAduan {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(KATEGORI_ADUAN, x);
}

export const KEPUTUSAN_ADUAN = {
  dismissed: "Aduan tidak terbukti",
  warning: "Terbukti — peringatan resmi",
  suspended: "Terbukti — akses Marketplace ditangguhkan",
} as const;
export type KeputusanAduan = keyof typeof KEPUTUSAN_ADUAN;

export function keputusanAduanSah(x: unknown): x is KeputusanAduan {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(KEPUTUSAN_ADUAN, x);
}

/* ================= PENGINGAT TRANSAKSI AMAN ================= */

/** Ditampilkan di bagian atas Marketplace — ringkas, bisa dilipat. */
export const TIPS_TRANSAKSI_AMAN: string[] = [
  "Periksa profil lawan transaksi: lama bergabung, transaksi selesai, rating, dan catatan aduan.",
  "Utamakan bertemu langsung (COD): periksa barang, lalu bayar di tempat.",
  "Kalau transfer, bayar HANYA ke rekening yang tercantum di kartu kesepakatan. Tolak permintaan transfer ke rekening atau nama lain — laporkan.",
  "Unggah bukti bayar dan bukti serah-terima/kirim di kartu kesepakatan, bukan hanya di chat. Bukti di aplikasi yang dipakai saat ada sengketa.",
  "Untuk outlet baru atau barang mahal, mulai dari nominal kecil atau bayar sebagian setelah barang terlihat.",
  "Tulis kondisi barang apa adanya dan tunjukkan kekurangannya di foto. Jual beli harus saling ridha — tidak ada yang disembunyikan.",
  "Tekan \"Barang Diterima & Sudah Dibayar\" hanya setelah keduanya benar-benar terjadi.",
];
