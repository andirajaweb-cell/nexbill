import { describe, it, expect } from "vitest";
import {
  hitungProfilKepercayaan,
  periksaBatasNilaiBarang,
  validasiRekening,
  rekeningBaruDiganti,
  samarkanRekening,
  validasiRating,
  bolehAdukan,
  bolehUlas,
  bolehUnggahBukti,
  kategoriAduanSah,
  keputusanAduanSah,
  AMBANG,
  type DataKepercayaan,
} from "./trust";

const NOW = new Date("2026-09-24T00:00:00.000Z");
const hariLalu = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

const dasar: DataKepercayaan = {
  joinedAt: hariLalu(200),
  completedDeals: 10,
  ratingSum: 48,
  ratingCount: 10,
  provenDisputes: 0,
  openDisputesAgainst: 0,
  suspended: false,
  subscriptionActive: true,
};

describe("hitungProfilKepercayaan", () => {
  it("lama, banyak transaksi, rating tinggi → Terpercaya", () => {
    const p = hitungProfilKepercayaan(dasar, NOW);
    expect(p.level).toBe("trusted");
    expect(p.avgRating).toBe(4.8);
    expect(p.peringatan).toEqual([]);
  });

  it("umur < 30 hari → Outlet Baru walau transaksinya banyak", () => {
    const p = hitungProfilKepercayaan({ ...dasar, joinedAt: hariLalu(10) }, NOW);
    expect(p.level).toBe("new");
    expect(p.isNew).toBe(true);
  });

  it("akun lama tanpa transaksi Marketplace → bukan Outlet Baru (tidak dibatasi), tapi diberi peringatan", () => {
    const p = hitungProfilKepercayaan({ ...dasar, completedDeals: 0, ratingCount: 0, ratingSum: 0 }, NOW);
    expect(p.level).toBe("active"); // belum Terpercaya: butuh ≥ 5 transaksi selesai
    expect(p.isNew).toBe(false);
    expect(p.peringatan.join(" ")).toMatch(/Belum punya riwayat/);
  });

  it("aduan terbukti → Perlu Hati-hati, mengalahkan label Terpercaya", () => {
    const p = hitungProfilKepercayaan({ ...dasar, provenDisputes: 1 }, NOW);
    expect(p.level).toBe("caution");
    expect(p.peringatan[0]).toMatch(/terbukti bermasalah/);
  });

  it("dua aduan terbuka → Perlu Hati-hati; satu aduan terbuka → hanya peringatan", () => {
    expect(hitungProfilKepercayaan({ ...dasar, openDisputesAgainst: 2 }, NOW).level).toBe("caution");
    const satu = hitungProfilKepercayaan({ ...dasar, openDisputesAgainst: 1 }, NOW);
    expect(satu.level).toBe("active"); // bukan trusted selama ada aduan terbuka
    expect(satu.peringatan.join(" ")).toMatch(/1 aduan/);
  });

  it("rating rendah dengan ≥ 3 ulasan → Perlu Hati-hati; 2 ulasan belum cukup", () => {
    expect(hitungProfilKepercayaan({ ...dasar, ratingSum: 9, ratingCount: 3 }, NOW).level).toBe("caution");
    expect(hitungProfilKepercayaan({ ...dasar, ratingSum: 2, ratingCount: 2 }, NOW).level).not.toBe("caution");
  });

  it("ditangguhkan mengalahkan semuanya", () => {
    expect(hitungProfilKepercayaan({ ...dasar, suspended: true }, NOW).level).toBe("suspended");
  });

  it("langganan tidak aktif → tidak bisa Terpercaya + peringatan", () => {
    const p = hitungProfilKepercayaan({ ...dasar, subscriptionActive: false }, NOW);
    expect(p.level).toBe("active");
    expect(p.peringatan.join(" ")).toMatch(/Langganan/);
  });

  it("belum ada ulasan → rating null, tetap bisa Terpercaya", () => {
    const p = hitungProfilKepercayaan({ ...dasar, ratingSum: 0, ratingCount: 0 }, NOW);
    expect(p.avgRating).toBeNull();
    expect(p.level).toBe("trusted");
  });
});

describe("periksaBatasNilaiBarang", () => {
  const baru = { isNew: true, level: "new" as const };
  const lama = { isNew: false, level: "active" as const };

  it("outlet baru: tepat di batas boleh, di atasnya ditolak (harga × jumlah)", () => {
    expect(() => periksaBatasNilaiBarang(baru, AMBANG.NILAI_MAKS_OUTLET_BARU, 1)).not.toThrow();
    expect(() => periksaBatasNilaiBarang(baru, 1_000_001, 2)).toThrow(/maksimal/);
  });

  it("outlet lama tidak dibatasi", () => {
    expect(() => periksaBatasNilaiBarang(lama, 9_000_000, 1)).not.toThrow();
  });

  it("outlet ditangguhkan tidak bisa memasang apa pun", () => {
    expect(() => periksaBatasNilaiBarang({ isNew: false, level: "suspended" }, 10_000, 1)).toThrow(/ditangguhkan/);
  });
});

describe("rekening", () => {
  it("dinormalisasi", () => {
    expect(validasiRekening({ bankName: " BCA ", accountNumber: "123-456 7890", holder: "  Budi   Santoso " })).toEqual({
      bankName: "BCA",
      accountNumber: "1234567890",
      holder: "Budi Santoso",
    });
  });
  it("menolak nomor bukan angka / terlalu pendek, nama kosong", () => {
    expect(() => validasiRekening({ bankName: "BCA", accountNumber: "12ab56", holder: "Budi" })).toThrow(/6–20 digit/);
    expect(() => validasiRekening({ bankName: "BCA", accountNumber: "12345", holder: "Budi" })).toThrow(/6–20 digit/);
    expect(() => validasiRekening({ bankName: "BCA", accountNumber: "1234567", holder: "" })).toThrow(/pemilik/);
    expect(() => validasiRekening({ bankName: "", accountNumber: "1234567", holder: "Budi" })).toThrow(/bank/);
  });
  it("rekening diganti < 7 hari → peringatan", () => {
    expect(rekeningBaruDiganti(hariLalu(2), NOW)).toBe(true);
    expect(rekeningBaruDiganti(hariLalu(8), NOW)).toBe(false);
    expect(rekeningBaruDiganti(null, NOW)).toBe(false);
  });
  it("disamarkan kecuali 4 digit terakhir", () => {
    expect(samarkanRekening("1234567890")).toBe("••••••7890");
    expect(samarkanRekening("123")).toBe("123");
  });
});

describe("aturan status", () => {
  it("rating 1–5 bulat", () => {
    expect(validasiRating(5)).toBe(5);
    expect(validasiRating("3")).toBe(3);
    for (const x of [0, 6, 4.5, "x", null]) expect(() => validasiRating(x)).toThrow();
  });
  it("aduan: setelah diterima, selesai, atau dibatalkan — bukan saat masih diajukan/ditolak", () => {
    expect(bolehAdukan("requested")).toBe(false);
    expect(bolehAdukan("rejected")).toBe(false);
    expect(bolehAdukan("accepted")).toBe(true);
    expect(bolehAdukan("completed")).toBe(true);
    expect(bolehAdukan("cancelled")).toBe(true);
  });
  it("ulasan hanya setelah selesai; bukti setelah diterima", () => {
    expect(bolehUlas("accepted")).toBe(false);
    expect(bolehUlas("completed")).toBe(true);
    expect(bolehUnggahBukti("requested")).toBe(false);
    expect(bolehUnggahBukti("accepted")).toBe(true);
  });
  it("kategori & keputusan hanya kunci yang dikenal", () => {
    expect(kategoriAduanSah("not_delivered")).toBe(true);
    expect(kategoriAduanSah("constructor")).toBe(false);
    expect(keputusanAduanSah("suspended")).toBe(true);
    expect(keputusanAduanSah("banned")).toBe(false);
  });
});
