import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { computeSessionCharge } from "./charge";
import { creditUseValue, leftoverMinutes, leftoverValue, validateCreditUse } from "./time-credit-core";

const base = { startedAt: "2026-10-25T10:00:00Z", accumulatedPauseMs: 0, extendedMinutes: 0 };

describe("saldo waktu member", () => {
  it("menghitung sisa menit sesi berdurasi yang berhenti lebih awal", () => {
    expect(leftoverMinutes({ ...base, plannedMinutes: 120, endedAt: "2026-10-25T11:15:00Z" })).toBe(45);
    // jeda tidak dihitung bermain
    expect(leftoverMinutes({ ...base, plannedMinutes: 120, accumulatedPauseMs: 15 * 60000, endedAt: "2026-10-25T11:15:00Z" })).toBe(60);
    // detik dibulatkan ke atas (menguntungkan outlet, tidak pernah menyimpan lebih)
    expect(leftoverMinutes({ ...base, plannedMinutes: 60, endedAt: "2026-10-25T10:20:30Z" })).toBe(39);
    expect(leftoverMinutes({ ...base, plannedMinutes: 60, endedAt: "2026-10-25T11:30:00Z" })).toBe(0);
    expect(leftoverMinutes({ ...base, plannedMinutes: null, endedAt: "2026-10-25T11:00:00Z" })).toBe(0);
    expect(leftoverMinutes({ ...base, plannedMinutes: 60, extendedMinutes: 30, endedAt: "2026-10-25T11:00:00Z" })).toBe(30);
  });

  it("nilai sisa = harga per menit sesi × sisa", () => {
    expect(leftoverValue(20000, 0, 120, 45)).toBe(7500);
    // sesi yang sebagian dibayar dengan saldo: nilai saldo ikut dihitung
    expect(leftoverValue(10000, 10000, 120, 60)).toBe(10000);
    expect(leftoverValue(20000, 0, 120, 0)).toBe(0);
  });

  it("nilai yang terpakai mengikuti rata-rata saldo", () => {
    expect(creditUseValue({ minutes: 60, value: 9000 }, 20)).toBe(3000);
    expect(creditUseValue({ minutes: 60, value: 9001 }, 60)).toBe(9001);
    expect(creditUseValue({ minutes: 0, value: 0 }, 10)).toBe(0);
  });

  it("validasi pemakaian", () => {
    const bal = { minutes: 30, value: 5000 };
    expect(validateCreditUse(0, bal, { promo: false, isMember: true })).toBeNull();
    expect(validateCreditUse(30, bal, { promo: false, isMember: true })).toBeNull();
    expect(validateCreditUse(31, bal, { promo: false, isMember: true })).toMatch(/tidak cukup/);
    expect(validateCreditUse(10, bal, { promo: true, isMember: true })).toMatch(/promo/);
    expect(validateCreditUse(10, bal, { promo: false, isMember: false })).toMatch(/member/);
    expect(validateCreditUse(1.5, bal, { promo: false, isMember: true })).toMatch(/tidak valid/);
  });

  it("menit saldo tidak ditagih di sesi durasi tetap", () => {
    const input = { promo: null, plannedMinutes: 90, extendedMinutes: 0, ratePerHour: 10000, elapsedMinutes: 90, roundingMinutes: 15 };
    expect(computeSessionCharge(input).subtotal).toBe(15000);
    const c = computeSessionCharge({ ...input, creditMinutes: 30 });
    expect(c.subtotal).toBe(10000);
    expect(c.billedMinutes).toBe(90);
    expect(c.billingNote).toContain("30 menit dari saldo waktu");
    // seluruh durasi dari saldo → Rp0, tidak pernah negatif
    expect(computeSessionCharge({ ...input, creditMinutes: 500 }).subtotal).toBe(0);
    // sesi terbuka & paket tidak terpengaruh
    expect(computeSessionCharge({ ...input, plannedMinutes: null, creditMinutes: 30 }).subtotal).toBe(15000);
    expect(computeSessionCharge({ ...input, promo: { name: "P", packagePrice: 12000, durationMinutes: 90 }, creditMinutes: 30 }).subtotal).toBe(12000);
  });

  it("void & refund membalik saldo waktu sebelum jurnal dibalik", () => {
    for (const f of ["../pos/void.ts", "../pos/refund.ts"]) {
      const src = readFileSync(join(__dirname, f), "utf8");
      const rev = src.indexOf("reverseTimeCreditsForOrder(orderId, tx)");
      expect(rev).toBeGreaterThan(0);
      expect(rev).toBeLessThan(src.indexOf("voidJournal(j.id"));
    }
  });
});
