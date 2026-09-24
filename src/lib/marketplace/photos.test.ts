import { describe, it, expect } from "vitest";
import { bersihkanFotoBarang, daftarFotoBarang, MAX_FOTO_BARANG } from "./photos";

const SB = "https://abc.supabase.co";
const foto = (n: number) => `${SB}/storage/v1/object/public/marketplace/${n}.jpg`;

describe("bersihkanFotoBarang", () => {
  it("kosong / null → tanpa foto", () => {
    expect(bersihkanFotoBarang(undefined, SB)).toEqual([]);
    expect(bersihkanFotoBarang(null, SB)).toEqual([]);
    expect(bersihkanFotoBarang([], SB)).toEqual([]);
  });

  it("menerima sampai 5 foto dari bucket marketplace, urutan dipertahankan", () => {
    const lima = [5, 1, 3, 2, 4].map(foto);
    expect(bersihkanFotoBarang(lima, SB)).toEqual(lima);
  });

  it("menolak lebih dari 5 foto", () => {
    const enam = Array.from({ length: MAX_FOTO_BARANG + 1 }, (_, i) => foto(i));
    expect(() => bersihkanFotoBarang(enam, SB)).toThrow(/Maksimal 5/);
  });

  it("duplikat dibuang sebelum dihitung", () => {
    expect(bersihkanFotoBarang([foto(1), foto(1), foto(2)], SB)).toEqual([foto(1), foto(2)]);
  });

  it("menolak URL dari server lain, bucket lain, atau path traversal", () => {
    expect(() => bersihkanFotoBarang(["https://evil.example/pixel.gif"], SB)).toThrow();
    expect(() => bersihkanFotoBarang([`${SB}/storage/v1/object/public/branding/logo.png`], SB)).toThrow();
    expect(() => bersihkanFotoBarang([`${SB}/storage/v1/object/public/marketplace/../branding/x.png`], SB)).toThrow();
  });

  it("menolak semua URL bila alamat Supabase tidak diketahui", () => {
    expect(() => bersihkanFotoBarang([foto(1)], undefined)).toThrow();
  });

  it("bukan array → ditolak", () => {
    expect(() => bersihkanFotoBarang(foto(1), SB)).toThrow(/Format/);
  });

  it("garis miring di akhir alamat Supabase tidak masalah", () => {
    expect(bersihkanFotoBarang([foto(1)], `${SB}/`)).toEqual([foto(1)]);
  });
});

describe("daftarFotoBarang", () => {
  it("memakai image_urls bila ada", () => {
    expect(daftarFotoBarang({ imageUrl: foto(1), imageUrls: JSON.stringify([foto(1), foto(2)]) })).toEqual([foto(1), foto(2)]);
  });

  it("barang lama tanpa image_urls → satu foto dari image_url", () => {
    expect(daftarFotoBarang({ imageUrl: foto(9), imageUrls: null })).toEqual([foto(9)]);
  });

  it("tanpa foto sama sekali → kosong", () => {
    expect(daftarFotoBarang({ imageUrl: null, imageUrls: null })).toEqual([]);
  });

  it("JSON rusak tidak membuat etalase gagal — jatuh ke image_url", () => {
    expect(daftarFotoBarang({ imageUrl: foto(1), imageUrls: "{rusak" })).toEqual([foto(1)]);
    expect(daftarFotoBarang({ imageUrl: null, imageUrls: "[]" })).toEqual([]);
  });
});
