import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLobbyCards, cleanAnnouncement, lobbyClock } from "./board";

const NOW = Date.parse("2026-10-25T12:00:00Z");
const unit = (id: string, name: string, status = "available") => ({ id, name, consoleType: "ps5", status });
const sess = (unitId: string, extra: Partial<Parameters<typeof buildLobbyCards>[1][number]> = {}) => ({
  rentalUnitId: unitId, status: "running", startedAt: "2026-10-25T11:30:00Z", pausedAt: null, accumulatedPauseMs: 0, plannedMinutes: null, extendedMinutes: 0, promoId: null, ...extra,
});

describe("papan lobi", () => {
  it("menghitung sisa waktu, segera kosong, sesi terbuka, jeda, perbaikan", () => {
    const cards = buildLobbyCards(
      [unit("a", "TV 1"), unit("b", "TV 2"), unit("c", "TV 3"), unit("d", "TV 4", "maintenance"), unit("e", "TV 5"), unit("f", "TV 10")],
      [sess("a", { plannedMinutes: 60 }), sess("b", { plannedMinutes: 35 }), sess("c"), sess("e", { status: "paused", pausedAt: "2026-10-25T11:50:00Z", plannedMinutes: 60 })],
      new Map(),
      new Map([["f", "2026-10-25T14:00:00Z"]]),
      NOW
    );
    const by = new Map(cards.map((c) => [c.id, c]));
    expect(by.get("a")).toMatchObject({ status: "playing", mode: "fixed", remainingSeconds: 1800, endingSoon: false });
    expect(by.get("b")).toMatchObject({ remainingSeconds: 300, endingSoon: true });
    expect(by.get("c")).toMatchObject({ mode: "open", remainingSeconds: null, elapsedSeconds: 1800 });
    expect(by.get("d")?.status).toBe("maintenance");
    expect(by.get("e")).toMatchObject({ status: "paused", remainingSeconds: 2400, endingSoon: false });
    expect(by.get("f")).toMatchObject({ status: "available", nextBookingAt: "2026-10-25T14:00:00Z" });
    // urutan: kosong dulu, lalu segera kosong
    expect(cards[0].id).toBe("f");
    expect(cards[1].id).toBe("b");
  });

  it("paket memakai durasi promo + perpanjangan", () => {
    const [c] = buildLobbyCards([unit("a", "TV 1")], [sess("a", { promoId: "p", extendedMinutes: 30 })], new Map([["p", 60]]), new Map(), NOW);
    expect(c).toMatchObject({ mode: "package", remainingSeconds: 3600 });
  });

  it("tidak pernah mengirim data pelanggan", () => {
    const [c] = buildLobbyCards([unit("a", "TV 1")], [{ ...sess("a"), customerName: "Budi" } as never], new Map(), new Map(), NOW);
    expect(JSON.stringify(c)).not.toContain("Budi");
    const api = readFileSync(join(__dirname, "..", "..", "app", "api", "public", "lobby", "route.ts"), "utf8");
    expect(api).not.toMatch(/customerName|customerId|totalAmount/);
  });

  it("jam & pengumuman", () => {
    expect(lobbyClock(3909)).toBe("1:05:09");
    expect(lobbyClock(309)).toBe("05:09");
    expect(cleanAnnouncement("  promo \n  malam  ")).toBe("promo malam");
    expect(cleanAnnouncement("")).toBeNull();
    expect(cleanAnnouncement("x".repeat(500))!.length).toBe(300);
  });
});
