import { describe, it, expect } from "vitest";
import { checkTvAction, packagesForConsole } from "./tv-session-rules";

const ctx = { screenUnitId: "unit-a", pinConfigured: true };

describe("sesi dari aplikasi NEXBILL TV", () => {
  it("hanya unit milik layar itu sendiri", () => {
    expect(checkTvAction({ kind: "start", rentalUnitId: "unit-a" }, ctx).ok).toBe(true);
    expect(checkTvAction({ kind: "start", rentalUnitId: "unit-b" }, ctx)).toMatchObject({ ok: false });
    expect(checkTvAction({ kind: "stop", sessionId: "s" }, { ...ctx, sessionUnitId: "unit-b" })).toMatchObject({ ok: false });
    expect(checkTvAction({ kind: "stop", sessionId: "s" }, { ...ctx, sessionUnitId: "__other_outlet__" })).toMatchObject({ ok: false });
    expect(checkTvAction({ kind: "extend", sessionId: "s" }, { ...ctx, sessionUnitId: "unit-a" }).ok).toBe(true);
    // sesi yang dimulai di TV dan belum ada di server: diteruskan (start-nya ikut di antrean)
    expect(checkTvAction({ kind: "stop", sessionId: "baru" }, { ...ctx, sessionUnitId: null }).ok).toBe(true);
  });

  it("tanpa PIN layar / unit, TV tidak boleh membuat sesi", () => {
    expect(checkTvAction({ kind: "start", rentalUnitId: "unit-a" }, { ...ctx, pinConfigured: false })).toMatchObject({ ok: false });
    expect(checkTvAction({ kind: "start", rentalUnitId: "unit-a" }, { ...ctx, screenUnitId: null })).toMatchObject({ ok: false });
  });

  it("TV tidak bisa mencatat pembayaran atau item", () => {
    expect(checkTvAction({ kind: "payCash", sessionId: "s" }, ctx)).toMatchObject({ ok: false });
    expect(checkTvAction({ kind: "addItems", sessionId: "s" }, ctx)).toMatchObject({ ok: false });
  });

  it("paket sesuai konsol, aktif, dan masih berlaku", () => {
    const base = { type: "rental_package", isActive: true, validFrom: null, validUntil: null, packagePrice: 10000 };
    const rows = [
      { ...base, id: "1", name: "PS5 2 jam", consoleType: "ps5", durationMinutes: 120 },
      { ...base, id: "2", name: "Semua 1 jam", consoleType: "any", durationMinutes: 60 },
      { ...base, id: "3", name: "PS4", consoleType: "ps4", durationMinutes: 60 },
      { ...base, id: "4", name: "Mati", consoleType: "ps5", durationMinutes: 60, isActive: false },
      { ...base, id: "5", name: "Lewat", consoleType: "ps5", durationMinutes: 60, validUntil: "2026-01-01T00:00:00Z" },
      { ...base, id: "6", name: "Voucher", consoleType: "ps5", durationMinutes: 60, type: "voucher_code" },
    ];
    expect(packagesForConsole(rows, "ps5", "2026-10-26T00:00:00Z").map((p) => p.id)).toEqual(["2", "1"]);
  });
});
