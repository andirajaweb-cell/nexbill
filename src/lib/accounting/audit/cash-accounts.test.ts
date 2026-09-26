import { describe, it, expect } from "vitest";
import { cashFamily, expectedFamiliesForMethod, familyHintFromName } from "./cash-accounts";

describe("cashFamily — golongan COA kas/bank", () => {
  it("classifies the default cash/bank codes", () => {
    expect(cashFamily("1112")).toBe("kas");
    expect(cashFamily("1121")).toBe("bank");
    expect(cashFamily("1125")).toBe("bank");
    expect(cashFamily("1131")).toBe("digital");
    expect(cashFamily("1151")).toBe("deposit");
    expect(cashFamily("1141")).toBe("other");
    expect(cashFamily(null)).toBe("other");
  });
});

describe("expectedFamiliesForMethod", () => {
  it("cash must land in Kas; non-cash never in Kas", () => {
    expect(expectedFamiliesForMethod("cash")).toEqual(["kas"]);
    for (const m of ["qris", "transfer", "card", "gopay", "dana", "ipaymu_va_bca"]) expect(expectedFamiliesForMethod(m)).not.toContain("kas");
  });
});

describe("familyHintFromName — nama Kas/Bank vs COA", () => {
  it("reads the seeded names correctly", () => {
    expect(familyHintFromName("Kas Utama")).toBe("kas");
    expect(familyHintFromName("Kas Kasir")).toBe("kas");
    expect(familyHintFromName("Rekening Bank Utama")).toBe("bank");
    expect(familyHintFromName("QRIS")).toBe("digital");
    expect(familyHintFromName("Saldo Deposit Fastpay (PPOB)")).toBe("deposit");
    expect(familyHintFromName("Dompet Pak Budi")).toBeNull();
  });
});
