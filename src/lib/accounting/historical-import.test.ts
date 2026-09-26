import { describe, it, expect } from "vitest";
import { normalizeHeader, parseAmount, parseImportDate, resolveOption, rowFingerprint } from "./historical-import";

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
