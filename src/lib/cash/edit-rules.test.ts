import { describe, expect, it } from "vitest";
import { assertCashEditAllowed, changedCashEditFields, correctionEntryDate, lockedCashEditFields, needsRepost, sameOutletDay, type CashEditSnapshot } from "./edit-rules";

const base: CashEditSnapshot = {
  amount: 500000,
  createdAt: "2026-11-10T05:00:00.000Z", // 10 Nov 12.00 WIB
  sourceCashBankAccountId: "kas",
  destinationCashBankAccountId: "bank",
  purposeType: "kas_besar",
  receivedByStaffUserId: "owner",
  notes: null,
};

describe("kolom terkunci", () => {
  it("shift masih buka / tanpa shift → semua boleh diubah", () => {
    expect(lockedCashEditFields("deposit", false)).toEqual([]);
    expect(lockedCashEditFields("transfer", false)).toEqual([]);
  });
  it("shift sudah ditutup → yang menyentuh laci dikunci", () => {
    expect(lockedCashEditFields("deposit", true)).toEqual(["amount", "source", "date"]);
    expect(lockedCashEditFields("transfer", true)).toEqual(["amount", "source", "destination", "date"]);
  });
});

describe("perubahan", () => {
  it("jam berbeda di hari WIB yang sama bukan ganti tanggal", () => {
    expect(sameOutletDay("2026-11-10T00:30:00.000Z", "2026-11-10T16:59:00.000Z")).toBe(true); // 07.30 & 23.59 WIB
    expect(sameOutletDay("2026-11-10T16:59:00.000Z", "2026-11-10T17:01:00.000Z")).toBe(false); // lewat tengah malam WIB
  });

  it("hanya kolom yang benar-benar berubah", () => {
    expect(changedCashEditFields(base, { ...base })).toEqual([]);
    expect(changedCashEditFields(base, { ...base, amount: 500000.001 })).toEqual([]);
    expect(changedCashEditFields(base, { ...base, amount: 450000, notes: "koreksi" })).toEqual(["amount", "notes"]);
    expect(changedCashEditFields(base, { ...base, createdAt: "2026-11-09T05:00:00.000Z", receivedByStaffUserId: "manager" })).toEqual(["date", "receiver"]);
    expect(changedCashEditFields(base, { ...base, purposeType: "prive", destinationCashBankAccountId: null })).toEqual(["destination", "purpose"]);
  });

  it("hanya catatan → tidak perlu jurnal ulang", () => {
    expect(needsRepost(["notes"])).toBe(false);
    expect(needsRepost([])).toBe(false);
    expect(needsRepost(["receiver"])).toBe(true);
    expect(needsRepost(["amount", "notes"])).toBe(true);
  });
});

describe("izin edit", () => {
  it("menolak kolom terkunci dengan pesan yang menyebut kolomnya", () => {
    expect(() => assertCashEditAllowed(["amount", "notes"], ["amount", "source", "date"])).toThrow(/jumlah/);
    expect(() => assertCashEditAllowed(["receiver", "notes", "purpose"], ["amount", "source", "date"])).not.toThrow();
  });
});

describe("tanggal jurnal pengganti", () => {
  const now = new Date("2026-11-15T03:00:00.000Z");
  it("tanggal diganti → tanggal baru", () => {
    expect(correctionEntryDate({ dateChanged: true, newDate: "2026-11-09T05:00:00.000Z", originalDate: base.createdAt, originalPeriodLocked: true, now })).toBe("2026-11-09T05:00:00.000Z");
  });
  it("tanggal tetap → tanggal asli; periode sudah ditutup → hari ini", () => {
    expect(correctionEntryDate({ dateChanged: false, newDate: base.createdAt, originalDate: base.createdAt, originalPeriodLocked: false, now })).toBe(base.createdAt);
    expect(correctionEntryDate({ dateChanged: false, newDate: base.createdAt, originalDate: base.createdAt, originalPeriodLocked: true, now })).toBe(now.toISOString());
  });
});
