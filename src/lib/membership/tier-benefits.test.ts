import { describe, it, expect } from "vitest";
import { computeMembershipExpiry, isMembershipActive, sisaHariKeanggotaan, isPaidTier, summarizeTierBenefits, punyaKeuntungan } from "./tier-benefits";

/*
 * Uji keanggotaan berbayar (2026-09-23).
 *
 * Dua janji yang dijaga di sini:
 *
 *  1. TIDAK ADA MEMBER LAMA YANG DIRUGIKAN. Sebelum perubahan ini keanggotaan tidak punya masa
 *     berlaku sama sekali, jadi seluruh data yang sudah ada punya validityDays 0 dan
 *     membershipExpiresAt null. Keduanya harus tetap berarti "berlaku tanpa batas waktu" —
 *     kalau salah satu saja diperlakukan sebagai "sudah habis", setiap member yang sudah ada
 *     kehilangan diskonnya diam-diam di hari deploy.
 *
 *  2. MEMPERPANJANG LEBIH AWAL TIDAK MENGHANGUSKAN SISA. Kebiasaan yang justru ingin didorong
 *     tidak boleh jadi kebiasaan yang merugikan.
 */

const HARI = 24 * 60 * 60 * 1000;
const sekarang = new Date("2026-09-23T05:00:00.000Z");

describe("computeMembershipExpiry", () => {
  it("masa berlaku 0 berarti seumur hidup — null, bukan tanggal jauh di masa depan", () => {
    expect(computeMembershipExpiry(0, null, sekarang)).toBeNull();
    expect(computeMembershipExpiry(null, null, sekarang)).toBeNull();
    expect(computeMembershipExpiry(undefined, null, sekarang)).toBeNull();
  });

  it("anggota baru dihitung dari hari pembelian", () => {
    const hasil = computeMembershipExpiry(30, null, sekarang);
    expect(hasil).toBe(new Date(sekarang.getTime() + 30 * HARI).toISOString());
  });

  it("memperpanjang LEBIH AWAL menumpuk di atas sisa yang masih berlaku", () => {
    // Masih tersisa 7 hari, lalu diperpanjang 30 hari => harus jadi 37 hari dari sekarang.
    const sisaTujuhHari = new Date(sekarang.getTime() + 7 * HARI).toISOString();
    const hasil = computeMembershipExpiry(30, sisaTujuhHari, sekarang);
    expect(hasil).toBe(new Date(sekarang.getTime() + 37 * HARI).toISOString());
  });

  it("memperpanjang setelah TELANJUR HABIS dihitung ulang dari hari ini, bukan dari tanggal habisnya", () => {
    // Kalau dihitung dari tanggal habis, member yang kembali setelah 2 bulan akan membeli
    // keanggotaan yang sebagian masa berlakunya sudah lewat sebelum dia membayarnya.
    const habisDuaBulanLalu = new Date(sekarang.getTime() - 60 * HARI).toISOString();
    const hasil = computeMembershipExpiry(30, habisDuaBulanLalu, sekarang);
    expect(hasil).toBe(new Date(sekarang.getTime() + 30 * HARI).toISOString());
  });

  it("tanggal lama yang tidak bisa diurai tidak menggagalkan pembelian", () => {
    const hasil = computeMembershipExpiry(30, "bukan tanggal", sekarang);
    expect(hasil).toBe(new Date(sekarang.getTime() + 30 * HARI).toISOString());
  });

  it("masa berlaku negatif diperlakukan seperti seumur hidup, bukan langsung kedaluwarsa", () => {
    expect(computeMembershipExpiry(-5, null, sekarang)).toBeNull();
  });
});

describe("isMembershipActive", () => {
  it("null = tanpa batas waktu = aktif — ini yang melindungi seluruh data lama", () => {
    expect(isMembershipActive(null, sekarang)).toBe(true);
    expect(isMembershipActive(undefined, sekarang)).toBe(true);
  });

  it("tanggal di masa depan berarti aktif, di masa lalu berarti habis", () => {
    expect(isMembershipActive(new Date(sekarang.getTime() + HARI).toISOString(), sekarang)).toBe(true);
    expect(isMembershipActive(new Date(sekarang.getTime() - HARI).toISOString(), sekarang)).toBe(false);
  });

  it("data rusak dianggap masih aktif — lebih baik kelebihan memberi diskon daripada mencabut hak yang sudah dibayar", () => {
    expect(isMembershipActive("???", sekarang)).toBe(true);
  });
});

describe("sisaHariKeanggotaan", () => {
  it("null untuk keanggotaan tanpa batas waktu", () => {
    expect(sisaHariKeanggotaan(null, sekarang)).toBeNull();
  });

  it("membulatkan ke atas, supaya sisa beberapa jam tidak terbaca sebagai 0 hari", () => {
    expect(sisaHariKeanggotaan(new Date(sekarang.getTime() + 2 * HARI).toISOString(), sekarang)).toBe(2);
    expect(sisaHariKeanggotaan(new Date(sekarang.getTime() + 3 * 60 * 60 * 1000).toISOString(), sekarang)).toBe(1);
  });

  it("tidak pernah negatif", () => {
    expect(sisaHariKeanggotaan(new Date(sekarang.getTime() - 40 * HARI).toISOString(), sekarang)).toBe(0);
  });
});

describe("isPaidTier", () => {
  it("berbayar hanya kalau biayanya di atas nol", () => {
    expect(isPaidTier({ feeAmount: 50000 })).toBe(true);
    expect(isPaidTier({ feeAmount: 0 })).toBe(false);
    expect(isPaidTier({ feeAmount: null })).toBe(false);
    expect(isPaidTier({})).toBe(false);
  });
});

describe("summarizeTierBenefits — pemisahan otomatis vs manual", () => {
  const tier = {
    feeAmount: 50000,
    discountPercent: 10,
    pointMultiplier: 2,
    freePlayMinutes: 30,
    freeFnbAmount: 15000,
    benefits: "Prioritas booking akhir pekan\n- Gratis 1 jam saat ulang tahun\n\n  • Boleh bawa 2 teman  ",
  };

  it("diskon dan pengali poin masuk kelompok otomatis — keduanya memang dipotong sistem", () => {
    const s = summarizeTierBenefits(tier);
    expect(s.otomatis).toEqual({ discountPercent: 10, pointMultiplier: 2 });
  });

  it("menit gratis dan F&B gratis masuk kelompok manual — tidak ada kode yang memotongnya", () => {
    const s = summarizeTierBenefits(tier);
    expect(s.manual.freePlayMinutes).toBe(30);
    expect(s.manual.freeFnbAmount).toBe(15000);
  });

  it("catatan bebas dipecah per baris, tanda bullet dan spasi berlebih dibersihkan", () => {
    const s = summarizeTierBenefits(tier);
    expect(s.manual.catatan).toEqual(["Prioritas booking akhir pekan", "Gratis 1 jam saat ulang tahun", "Boleh bawa 2 teman"]);
  });

  it("tier kosong tidak menghasilkan undefined di mana pun", () => {
    const s = summarizeTierBenefits({});
    expect(s.otomatis).toEqual({ discountPercent: 0, pointMultiplier: 1 });
    expect(s.manual).toEqual({ freePlayMinutes: 0, freeFnbAmount: 0, catatan: [] });
  });
});

describe("punyaKeuntungan", () => {
  it("tier tanpa keuntungan apa pun dikenali kosong", () => {
    expect(punyaKeuntungan({ discountPercent: 0, pointMultiplier: 1 })).toBe(false);
  });

  it("satu keuntungan saja sudah cukup, dari kelompok mana pun", () => {
    expect(punyaKeuntungan({ discountPercent: 5 })).toBe(true);
    expect(punyaKeuntungan({ pointMultiplier: 1.5 })).toBe(true);
    expect(punyaKeuntungan({ freePlayMinutes: 15 })).toBe(true);
    expect(punyaKeuntungan({ freeFnbAmount: 10000 })).toBe(true);
    expect(punyaKeuntungan({ benefits: "Prioritas booking" })).toBe(true);
  });
});
