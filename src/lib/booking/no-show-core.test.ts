import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { evaluateBlock, normalizePhone, sanitizePolicy } from "./no-show-core";

const NOW = Date.parse("2026-10-25T12:00:00Z");
const day = (n: number) => new Date(NOW - n * 86400000).toISOString();
const policy = { enabled: true, threshold: 3, windowDays: 90 };

describe("blacklist no-show booking", () => {
  it("menormalkan nomor WhatsApp", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
    expect(normalizePhone("+62 812 3456 7890")).toBe("6281234567890");
    expect(normalizePhone("81234567890")).toBe("6281234567890");
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
    expect(normalizePhone("abc")).toBe("");
    expect(normalizePhone(null)).toBe("");
  });

  it("blokir otomatis setelah batas no-show dalam jendela", () => {
    expect(evaluateBlock([day(1), day(10)], [], policy, NOW).blocked).toBe(false);
    const v = evaluateBlock([day(1), day(10), day(30)], [], policy, NOW);
    expect(v).toMatchObject({ blocked: true, source: "auto", countedNoShows: 3 });
    // di luar jendela 90 hari tidak dihitung
    expect(evaluateBlock([day(1), day(10), day(120)], [], policy, NOW).blocked).toBe(false);
    // aturan dimatikan
    expect(evaluateBlock([day(1), day(2), day(3)], [], { ...policy, enabled: false }, NOW).blocked).toBe(false);
  });

  it("lepas blokir = no-show sebelumnya tidak dihitung", () => {
    const forgive = [{ kind: "forgive" as const, createdAt: day(5), liftedAt: null, reason: null }];
    expect(evaluateBlock([day(6), day(10), day(30)], forgive, policy, NOW)).toMatchObject({ blocked: false, countedNoShows: 0 });
    expect(evaluateBlock([day(1), day(2), day(3), day(30)], forgive, policy, NOW)).toMatchObject({ blocked: true, countedNoShows: 3 });
  });

  it("blokir manual berlaku sampai dilepas", () => {
    const manual = [{ kind: "block" as const, createdAt: day(2), liftedAt: null, reason: "kasar" }];
    expect(evaluateBlock([], manual, policy, NOW)).toMatchObject({ blocked: true, source: "manual", reason: "kasar" });
    expect(evaluateBlock([], [{ ...manual[0], liftedAt: day(1) }], policy, NOW).blocked).toBe(false);
  });

  it("aturan dibatasi ke rentang aman", () => {
    expect(sanitizePolicy({ threshold: 0, windowDays: 5000 })).toMatchObject({ threshold: 1, windowDays: 730 });
    expect(sanitizePolicy({ threshold: "x" as never })).toMatchObject({ threshold: 3, windowDays: 90 });
  });

  it("booking online dicek blacklist sebelum dibuat", () => {
    const src = readFileSync(join(__dirname, "..", "..", "app", "api", "public", "bookings", "route.ts"), "utf8");
    expect(src.indexOf("checkBookingBlock(outletId, phone)")).toBeGreaterThan(0);
    expect(src.indexOf("checkBookingBlock(outletId, phone)")).toBeLessThan(src.indexOf("createBooking({"));
  });
});
