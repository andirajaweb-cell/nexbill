/**
 * Aritmetika keanggotaan yang MURNI — tanpa import database, tanpa import server.
 *
 * Dipisah dari membership-fee.ts dengan alasan yang sama seperti charge.ts vs pricing.ts dan
 * product-lang.ts vs translate-product.ts: halaman "use client" (tab Membership Tier, panel
 * penjualan keanggotaan) perlu menghitung dan menampilkan hal yang sama persis dengan yang
 * dihitung server saat menjual, dan satu-satunya cara memastikan keduanya tidak pernah berbeda
 * adalah memakai fungsi yang SAMA. Kalau logikanya ikut di file yang mengimpor db/client, halaman
 * client tidak bisa memakainya dan terpaksa menyalin rumusnya — dan salinan itulah yang pelan-pelan
 * melenceng.
 */

/** Bentuk minimal sebuah tier yang dibutuhkan fungsi-fungsi di sini — sengaja bukan tipe tabelnya, supaya modul ini tidak menarik skema. */
export interface TierBenefitFields {
  feeAmount?: number | null;
  validityDays?: number | null;
  discountPercent?: number | null;
  pointMultiplier?: number | null;
  freePlayMinutes?: number | null;
  freeFnbAmount?: number | null;
  benefits?: string | null;
}

const num = (v: number | null | undefined, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Tier berbayar = ada biaya keanggotaan yang harus dibayar di kasir. Tier gratis didapat lewat total belanja (minSpending) saja. */
export function isPaidTier(tier: TierBenefitFields): boolean {
  return num(tier.feeAmount) > 0;
}

/**
 * Menghitung tanggal berakhir keanggotaan setelah pembelian/perpanjangan.
 *
 * KENAPA MEMPERPANJANG DARI SISA, BUKAN DARI HARI INI. Kalau member memperpanjang seminggu
 * sebelum habis, menghitung dari hari ini akan MENGHANGUSKAN sisa tujuh hari yang sudah dia bayar.
 * Itu menghukum orang yang memperpanjang lebih awal — persis kebiasaan yang ingin didorong.
 * Jadi perpanjangan ditumpuk di atas sisa yang masih berlaku; kalau sudah telanjur habis
 * (atau belum pernah punya), hitungannya mulai dari hari ini.
 *
 * validityDays 0 berarti seumur hidup: mengembalikan null, bukan tanggal yang sangat jauh, supaya
 * "tanpa batas waktu" terbaca apa adanya di database alih-alih jadi angka ajaib.
 */
export function computeMembershipExpiry(
  validityDays: number | null | undefined,
  currentExpiresAt: string | null | undefined,
  now: Date = new Date()
): string | null {
  const days = Math.floor(num(validityDays));
  if (days <= 0) return null;

  const currentMs = currentExpiresAt ? Date.parse(currentExpiresAt) : NaN;
  const mulaiMs = Number.isFinite(currentMs) && currentMs > now.getTime() ? currentMs : now.getTime();

  return new Date(mulaiMs + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Apakah keanggotaan masih berlaku pada saat `now`.
 *
 * expiresAt null = tanpa batas waktu = selalu aktif. Nilai yang tidak bisa diurai juga dianggap
 * aktif: data rusak tidak boleh diam-diam mencabut diskon yang sudah dibayar member — lebih baik
 * merchant kelebihan memberi diskon daripada menagih member yang merasa dirugikan di depan kasir.
 */
export function isMembershipActive(expiresAt: string | null | undefined, now: Date = new Date()): boolean {
  if (!expiresAt) return true;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return true;
  return ms > now.getTime();
}

/** Sisa hari keanggotaan; null kalau tanpa batas waktu, 0 kalau sudah habis. */
export function sisaHariKeanggotaan(expiresAt: string | null | undefined, now: Date = new Date()): number | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil((ms - now.getTime()) / (24 * 60 * 60 * 1000)));
}

export interface TierBenefitSummary {
  /** Keuntungan yang DIPOTONG SISTEM sendiri — tidak perlu diingat kasir. */
  otomatis: { discountPercent: number; pointMultiplier: number };
  /** Keuntungan yang DIBERIKAN KASIR secara manual — sistem hanya menampilkannya sebagai pengingat. */
  manual: { freePlayMinutes: number; freeFnbAmount: number; catatan: string[] };
}

/**
 * Memisahkan keuntungan tier menjadi dua kelompok: yang berlaku otomatis dan yang harus diberikan
 * kasir sendiri.
 *
 * KENAPA PEMISAHAN INI PENTING. Diskon persen memang dipotong sendiri oleh
 * computeEffectiveHourlyRate(), tapi "gratis 30 menit" dan "gratis kopi" tidak — tidak ada kode
 * mana pun yang memotongnya. Menampilkan keempatnya dalam satu daftar rata akan membuat merchant
 * mengira semuanya berjalan sendiri, lalu kaget saat member menagih jam gratis yang tidak pernah
 * muncul di bill. Jadi layarnya memberi label berbeda untuk dua kelompok ini, dan fungsi inilah
 * satu-satunya tempat pembagiannya ditentukan.
 */
export function summarizeTierBenefits(tier: TierBenefitFields): TierBenefitSummary {
  const catatan = (tier.benefits ?? "")
    .split("\n")
    // Dirapikan DULU baru tanda bullet-nya dibuang: baris yang ditulis dengan indentasi
    // ("  • Boleh bawa 2 teman") tidak diawali tanda bullet secara harfiah, sehingga pola yang
    // langsung dijangkarkan ke awal string akan melewatkannya dan bullet-nya ikut tampil dobel.
    .map((baris) => baris.trim().replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return {
    otomatis: {
      discountPercent: num(tier.discountPercent),
      pointMultiplier: num(tier.pointMultiplier, 1),
    },
    manual: {
      freePlayMinutes: Math.floor(num(tier.freePlayMinutes)),
      freeFnbAmount: num(tier.freeFnbAmount),
      catatan,
    },
  };
}

/** True kalau tier ini benar-benar menawarkan sesuatu — dipakai layar untuk tidak menampilkan kotak keuntungan yang kosong. */
export function punyaKeuntungan(tier: TierBenefitFields): boolean {
  const s = summarizeTierBenefits(tier);
  return (
    s.otomatis.discountPercent > 0 ||
    s.otomatis.pointMultiplier > 1 ||
    s.manual.freePlayMinutes > 0 ||
    s.manual.freeFnbAmount > 0 ||
    s.manual.catatan.length > 0
  );
}
