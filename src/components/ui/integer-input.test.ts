import { describe, it, expect } from "vitest";
import { clampInteger, parseIntegerInRange } from "./IntegerInput";

describe("IntegerInput — kolom angka yang bisa dikosongkan saat mengetik", () => {
  it("kosong bukan nilai sah (boleh sementara), jadi '1' bisa dihapus lalu diganti '2'", () => {
    expect(parseIntegerInRange("", 1, 20)).toBeNull();
    expect(parseIntegerInRange("2", 1, 20)).toBe(2);
  });
  it("menolak di luar batas & pecahan sampai kolom ditinggalkan", () => {
    expect(parseIntegerInRange("25", 1, 20)).toBeNull();
    expect(parseIntegerInRange("1.5", 1, 20)).toBeNull();
    expect(parseIntegerInRange("0", 1, 20)).toBeNull();
  });
  it("saat ditinggalkan: kosong kembali ke nilai terakhir, di luar batas dijepit", () => {
    expect(clampInteger("", 1, 20, 3)).toBe(3);
    expect(clampInteger("25", 1, 20, 3)).toBe(20);
    expect(clampInteger("0", 1, 20, 3)).toBe(1);
    expect(clampInteger("2.7", 1, 20, 3)).toBe(2);
  });
});
