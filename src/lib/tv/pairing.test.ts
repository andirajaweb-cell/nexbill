import { describe, it, expect } from "vitest";
import { generatePairingCode, generateScreenToken, isPairingCodeValid, normalizePairingCode, pairingCodeExpiry, validatePin } from "./pairing";

describe("generatePairingCode", () => {
  it("selalu tepat 6 digit, termasuk yang berawalan nol", () => {
    for (let i = 0; i < 200; i++) expect(generatePairingCode()).toMatch(/^\d{6}$/);
  });

  it("tidak mengembalikan kode yang sama berturut-turut", () => {
    // Bukan uji keacakan yang sesungguhnya — hanya jaring pengaman terhadap kesalahan yang paling
    // sering terjadi: sumber acak yang lupa dipanggil ulang dan mengembalikan nilai tetap.
    const codes = new Set(Array.from({ length: 50 }, () => generatePairingCode()));
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe("generateScreenToken", () => {
  it("heksadesimal 64 karakter (256 bit)", () => {
    expect(generateScreenToken()).toMatch(/^[0-9a-f]{64}$/);
  });

  it("berbeda setiap kali", () => {
    expect(generateScreenToken()).not.toBe(generateScreenToken());
  });
});

describe("normalizePairingCode", () => {
  it("menerima 6 digit polos", () => {
    expect(normalizePairingCode("042317")).toBe("042317");
  });

  it("membuang spasi dan tanda hubung — merchant membacakan kode lewat telepon sebagai '123 456'", () => {
    expect(normalizePairingCode("123 456")).toBe("123456");
    expect(normalizePairingCode("123-456")).toBe("123456");
    expect(normalizePairingCode(" 123456 ")).toBe("123456");
  });

  it("menolak panjang yang salah dan karakter bukan angka", () => {
    expect(normalizePairingCode("12345")).toBeNull();
    expect(normalizePairingCode("1234567")).toBeNull();
    expect(normalizePairingCode("12345a")).toBeNull();
    expect(normalizePairingCode("")).toBeNull();
    expect(normalizePairingCode(null)).toBeNull();
    expect(normalizePairingCode(undefined)).toBeNull();
  });
});

describe("isPairingCodeValid", () => {
  it("berlaku sebelum kedaluwarsa, tidak berlaku sesudahnya", () => {
    const now = new Date("2026-09-23T10:00:00.000Z");
    expect(isPairingCodeValid("2026-09-23T10:00:01.000Z", now)).toBe(true);
    expect(isPairingCodeValid("2026-09-23T09:59:59.000Z", now)).toBe(false);
  });

  it("tanpa tanggal kedaluwarsa dianggap SUDAH HANGUS — gagal ke sisi aman", () => {
    // Kolomnya nullable, dan null berarti kodenya sudah ditukar. Memperlakukannya sebagai "berlaku
    // selamanya" akan membuat setiap kode yang sudah terpakai bisa dipakai lagi.
    expect(isPairingCodeValid(null)).toBe(false);
    expect(isPairingCodeValid(undefined)).toBe(false);
    expect(isPairingCodeValid("bukan tanggal")).toBe(false);
  });

  it("kode baru dari pairingCodeExpiry() berlaku sekarang", () => {
    const now = new Date("2026-09-23T10:00:00.000Z");
    expect(isPairingCodeValid(pairingCodeExpiry(now), now)).toBe(true);
  });
});

describe("validatePin", () => {
  it("menerima 4-6 digit yang wajar", () => {
    expect(validatePin("8351").ok).toBe(true);
    expect(validatePin("930472").ok).toBe(true);
  });

  it("menolak panjang di luar 4-6 dan karakter bukan angka", () => {
    expect(validatePin("123").ok).toBe(false);
    expect(validatePin("1234567").ok).toBe(false);
    expect(validatePin("12a4").ok).toBe(false);
  });

  it("menolak angka kembar dan berurutan — layar ini berdiri di ruang publik", () => {
    expect(validatePin("0000").ok).toBe(false);
    expect(validatePin("111111").ok).toBe(false);
    expect(validatePin("1234").ok).toBe(false);
    expect(validatePin("123456").ok).toBe(false);
    expect(validatePin("4321").ok).toBe(false);
  });

  it("menyertakan alasan penolakan yang bisa dibaca merchant", () => {
    const result = validatePin("0000");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("mudah ditebak");
  });
});
