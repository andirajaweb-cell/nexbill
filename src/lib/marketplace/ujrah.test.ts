import { describe, it, expect } from "vitest";
import {
  computeUjrah,
  bersihUntukPenjual,
  totalDibayarPembeli,
  bolehPindahStatus,
  bolehDilakukanOleh,
  statusListingSetelah,
  TRANSISI_SAH,
  UJRAH_CONFIG_DEFAULT,
  UJRAH_AKTIF,
  ujrahConfigBerlaku,
  type DealStatus,
} from "./ujrah";

describe("saklar arsip ujrah (Marketplace gratis sementara, 2026-09-24)", () => {
  it("selama diarsipkan, tidak ada ujrah untuk nilai berapa pun dan penjual menerima utuh", () => {
    if (UJRAH_AKTIF) return; // saklar sudah dinyalakan lagi — uji ini tidak berlaku
    for (const harga of [15_000, 20_000, 350_000, 9_000_000]) {
      expect(computeUjrah(harga, 1, ujrahConfigBerlaku())).toBe(0);
      expect(bersihUntukPenjual(harga, 2, ujrahConfigBerlaku())).toBe(harga * 2);
    }
  });
});

/*
 * Uji Marketplace Antar-Outlet (2026-09-23).
 *
 * Tiga hal yang dijaga di sini, semuanya menyangkut uang orang lain:
 *
 *  1. UJRAH TIDAK PERNAH BERUBAH JADI PERSENTASE. Pemilik memilih akad ujrah bernominal tetap
 *     secara eksplisit. Uji di bawah memastikan harga barang — berapa pun besarnya — tidak
 *     memengaruhi besaran upahnya, karena begitu ia mengikuti harga, akadnya bukan ijarah lagi.
 *
 *  2. HANYA PIHAK YANG BERHAK YANG BISA MEMINDAHKAN STATUS. Penjual yang menerima/menolak,
 *     pembeli yang menyatakan selesai. Kalau penjual bisa menyatakan selesai sendiri, ia bisa
 *     memunculkan jurnal pendapatan atas barang yang belum dikirim.
 *
 *  3. STATUS AKHIR BENAR-BENAR AKHIR. Kesepakatan yang sudah selesai sudah memunculkan jurnal
 *     pendapatan dan ujrah yang tertagih; membukanya kembali membatalkan keduanya diam-diam.
 */

describe("computeUjrah — upah tetap, bukan persentase", () => {
  it("nominalnya sama untuk barang murah maupun mahal — inti dari akad ujrah", () => {
    expect(computeUjrah(100_000)).toBe(UJRAH_CONFIG_DEFAULT.nominal);
    expect(computeUjrah(3_000_000)).toBe(UJRAH_CONFIG_DEFAULT.nominal);
    // Kalau suatu saat ini gagal karena hasilnya ikut membesar, akadnya sudah berubah jadi
    // samsarah berbasis persen — perubahan yang harus disepakati pemilik, bukan diselipkan.
    expect(computeUjrah(3_000_000)).toBe(computeUjrah(100_000));
  });

  it("transaksi di bawah ambang minimum dibebaskan sepenuhnya", () => {
    expect(computeUjrah(15_000)).toBe(0);
    expect(computeUjrah(UJRAH_CONFIG_DEFAULT.hargaMinimum - 1)).toBe(0);
  });

  it("tepat di ambang minimum sudah dikenakan", () => {
    expect(computeUjrah(UJRAH_CONFIG_DEFAULT.hargaMinimum)).toBe(UJRAH_CONFIG_DEFAULT.nominal);
  });

  it("jumlah unit ikut menentukan apakah ambangnya terlewati, tapi tidak menggandakan ujrahnya", () => {
    // 3 x Rp8.000 = Rp24.000, sudah di atas ambang — tapi tetap satu transaksi, satu upah.
    expect(computeUjrah(8_000, 3)).toBe(UJRAH_CONFIG_DEFAULT.nominal);
  });

  it("ujrah tidak pernah melebihi nilai transaksinya sendiri, bahkan saat salah konfigurasi", () => {
    const konfigurasiNgawur = { nominal: 900_000, hargaMinimum: 1_000 };
    expect(computeUjrah(50_000, 1, konfigurasiNgawur)).toBe(50_000);
  });

  it("harga negatif atau nol tidak menghasilkan tagihan", () => {
    expect(computeUjrah(0)).toBe(0);
    expect(computeUjrah(-500_000)).toBe(0);
  });
});

describe("totalDibayarPembeli dan bersihUntukPenjual", () => {
  it("pembeli membayar harga barang saja — ujrah TIDAK dibebankan padanya", () => {
    // Ujrah ditagih ke penjual lewat fakturnya sendiri. Membebankannya ke pembeli akan membuat
    // harga yang disepakati berbeda dari yang dibayar, dan itu bukan yang disetujui kedua pihak.
    expect(totalDibayarPembeli(500_000)).toBe(500_000);
    expect(totalDibayarPembeli(250_000, 2)).toBe(500_000);
  });

  it("penjual menerima harga dikurangi ujrah", () => {
    expect(bersihUntukPenjual(500_000)).toBe(500_000 - UJRAH_CONFIG_DEFAULT.nominal);
  });

  it("penjual barang murah menerima utuh, karena bebas ujrah", () => {
    expect(bersihUntukPenjual(15_000)).toBe(15_000);
  });
});

describe("alur status kesepakatan", () => {
  it("jalur normal: diajukan -> disetujui -> selesai", () => {
    expect(bolehPindahStatus("requested", "accepted")).toBe(true);
    expect(bolehPindahStatus("accepted", "completed")).toBe(true);
  });

  it("tidak bisa melompati persetujuan penjual", () => {
    expect(bolehPindahStatus("requested", "completed")).toBe(false);
  });

  it("status akhir benar-benar akhir — tidak ada jalan keluar dari completed/rejected/cancelled", () => {
    const akhir: DealStatus[] = ["completed", "rejected", "cancelled"];
    for (const s of akhir) expect(TRANSISI_SAH[s]).toEqual([]);
  });

  it("pembatalan mungkin sebelum selesai, tidak mungkin sesudahnya", () => {
    expect(bolehPindahStatus("requested", "cancelled")).toBe(true);
    expect(bolehPindahStatus("accepted", "cancelled")).toBe(true);
    expect(bolehPindahStatus("completed", "cancelled")).toBe(false);
  });
});

describe("siapa boleh melakukan apa", () => {
  it("hanya PENJUAL yang menerima atau menolak — barangnya miliknya", () => {
    expect(bolehDilakukanOleh("seller", "accepted")).toBe(true);
    expect(bolehDilakukanOleh("buyer", "accepted")).toBe(false);
    expect(bolehDilakukanOleh("seller", "rejected")).toBe(true);
    expect(bolehDilakukanOleh("buyer", "rejected")).toBe(false);
  });

  it("hanya PEMBELI yang menyatakan selesai — kalau tidak, penjual bisa memunculkan pendapatan atas barang yang belum dikirim", () => {
    expect(bolehDilakukanOleh("buyer", "completed")).toBe(true);
    expect(bolehDilakukanOleh("seller", "completed")).toBe(false);
  });

  it("kedua pihak boleh membatalkan, supaya kesepakatan yang batal di dunia nyata tidak tersangkut di aplikasi", () => {
    expect(bolehDilakukanOleh("seller", "cancelled")).toBe(true);
    expect(bolehDilakukanOleh("buyer", "cancelled")).toBe(true);
  });
});

describe("statusListingSetelah — etalase mengikuti kesepakatan", () => {
  it("barang yang sedang dalam kesepakatan tidak lagi ditawarkan ke outlet lain", () => {
    expect(statusListingSetelah("accepted")).toBe("reserved");
  });

  it("barang yang terjual hilang dari etalase", () => {
    expect(statusListingSetelah("completed")).toBe("sold");
  });

  it("kesepakatan yang batal MENGEMBALIKAN barang ke etalase — kalau tidak, satu penawaran iseng bisa mengubur barang selamanya", () => {
    expect(statusListingSetelah("rejected")).toBe("active");
    expect(statusListingSetelah("cancelled")).toBe("active");
  });

  it("penawaran yang baru masuk belum mengubah apa pun", () => {
    expect(statusListingSetelah("requested")).toBeNull();
  });
});
