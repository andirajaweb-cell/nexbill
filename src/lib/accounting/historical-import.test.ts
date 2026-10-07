import { describe, it, expect } from "vitest";
import { mapHeaders, normalizeHeader, parseAmount, parseImportDate, resolveOption, rowFingerprint } from "./historical-import";
import { TEMPLATE_COLUMNS, templateHeaders, templateLangFor, type HistoricalCategory } from "./historical-import-columns";

/*
 * Impor Data Historis dulu salah membaca dua hal paling dasar dari Excel:
 *  - sel tanggal Excel datang sebagai nomor seri (45292) dan menjadi tahun 1970;
 *  - "01/02/2026" dibaca JavaScript sebagai 2 Januari (format AS), padahal petunjuknya DD/MM/YYYY.
 */

describe("parseImportDate", () => {
  it("reads Excel serial dates", () => {
    expect(parseImportDate(45292)).toBe("2024-01-01");
    expect(parseImportDate(46023)).toBe("2026-01-01");
  });
  it("reads day-first Indonesian dates, never US month-first", () => {
    expect(parseImportDate("01/02/2026")).toBe("2026-02-01");
    expect(parseImportDate("31-01-2026")).toBe("2026-01-31");
    expect(parseImportDate("5.3.26")).toBe("2026-03-05");
    expect(parseImportDate("2026-01-31")).toBe("2026-01-31");
  });
  it("rejects impossible dates", () => {
    expect(parseImportDate("31/02/2026")).toBeNull();
    expect(parseImportDate("13/13/2026")).toBeNull();
    expect(parseImportDate("kemarin")).toBeNull();
    expect(parseImportDate("")).toBeNull();
  });
});

describe("parseAmount", () => {
  it("accepts the ways Indonesians write money", () => {
    expect(parseAmount(1500000)).toBe(1500000);
    expect(parseAmount("1500000")).toBe(1500000);
    expect(parseAmount("1.500.000")).toBe(1500000);
    expect(parseAmount("Rp 1.500.000")).toBe(1500000);
    expect(parseAmount("Rp1.500.000,50")).toBe(1500000.5);
    expect(parseAmount("1,500,000")).toBe(1500000);
    expect(parseAmount("12,5")).toBe(12.5);
    expect(parseAmount("2.5")).toBe(2.5);
  });
  it("returns null for blanks and garbage", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("-")).toBeNull();
    expect(parseAmount("seratus")).toBeNull();
  });
});

describe("headers, options, fingerprint", () => {
  it("normalizes header text", () => {
    expect(normalizeHeader(" Penjualan Kotor* ")).toBe("penjualan kotor");
    expect(normalizeHeader("Metode Pembayaran (wajib)")).toBe("metode pembayaran");
  });
  it("matches options by key, full label, or label before the parenthesis", () => {
    const opts = { cash: "Tunai (Cash)", qris: "QRIS" };
    expect(resolveOption("tunai", opts)).toBe("cash");
    expect(resolveOption("Tunai (Cash)", opts)).toBe("cash");
    expect(resolveOption("qris", opts)).toBe("qris");
    expect(resolveOption("ovo", opts)).toBeNull();
  });
  it("gives identical rows distinct fingerprints by occurrence, and is stable across uploads", () => {
    const row = ["2026-01-05", "Rental PS", "", 500000];
    const a1 = rowFingerprint("penjualan", "kas", row, 1);
    expect(rowFingerprint("penjualan", "kas", row, 1)).toBe(a1);
    expect(rowFingerprint("penjualan", "kas", row, 2)).not.toBe(a1);
    expect(rowFingerprint("penjualan", "saldo_awal", row, 1)).not.toBe(a1);
  });
});

/*
 * Template tersedia dalam Bahasa Indonesia dan Inggris. Judul kolom di layar dan di file berasal dari
 * TEMPLATE_COLUMNS, jadi setiap judul (dua bahasa) harus terbaca kembali ke kolom yang benar — dan
 * file Indonesia tetap bisa diimpor dari dashboard berbahasa Inggris, begitu pula sebaliknya.
 */
describe("bilingual template columns", () => {
  const categories = Object.keys(TEMPLATE_COLUMNS) as HistoricalCategory[];

  it.each(categories.flatMap((c) => (["id", "en"] as const).map((l) => [c, l] as const)))("%s template (%s) headers map back to their columns", (category, lang) => {
    const headers = templateHeaders(category, lang);
    const idx = mapHeaders(headers);
    TEMPLATE_COLUMNS[category].forEach((col, i) => expect(idx[col.key]).toBe(i));
  });

  it("uses English headers for the English template", () => {
    expect(templateHeaders("penjualan", "en").slice(0, 2)).toEqual(["Date*", "Revenue Category"]);
    expect(templateHeaders("penjualan", "id").slice(0, 2)).toEqual(["Tanggal*", "Kategori Pendapatan"]);
  });

  it("picks the Indonesian template only for an Indonesian dashboard", () => {
    expect(templateLangFor("id")).toBe("id");
    for (const l of ["en", "ms", "th", "fil", "vi", null, undefined]) expect(templateLangFor(l)).toBe("en");
  });

  it("still reads legacy Indonesian headers", () => {
    const idx = mapHeaders(["Tgl", "Kategori", "Kode Akun", "Keterangan", "Jumlah", "Metode", "Pihak"]);
    expect(idx).toMatchObject({ tanggal: 0, kategori: 1, kodeAkun: 2, deskripsi: 3, nominal: 4, metode: 5, pihak: 6 });
  });

  it("matches option labels in either language", () => {
    const opts = { cash: ["Tunai (Cash)", "Cash"], transfer: ["Transfer Bank", "Bank Transfer"] };
    expect(resolveOption("Cash", opts)).toBe("cash");
    expect(resolveOption("tunai", opts)).toBe("cash");
    expect(resolveOption("Bank Transfer", opts)).toBe("transfer");
    expect(resolveOption("Transfer Bank", opts)).toBe("transfer");
  });
});
