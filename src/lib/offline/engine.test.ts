import { describe, it, expect } from "vitest";
import { deriveLocalState, estimateSession, type OfflineSnapshot } from "./engine";
import type { OfflineAction } from "./protocol";
import { computeSessionCharge } from "@/lib/rental/charge";

const T0 = Date.parse("2026-10-07T03:00:00.000Z"); // 10:00 WIB, Wednesday
const iso = (minutes: number) => new Date(T0 + minutes * 60_000).toISOString();
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

const snapshot: OfflineSnapshot = {
  version: 1,
  serverTime: iso(0),
  outlet: { id: "o1", name: "Outlet", billingRoundingMinutes: 1 },
  staff: { id: "s1", name: "Kasir" },
  units: [
    { id: "u1", name: "PS 1", consoleType: "ps5", hourlyRate: 12000, status: "available", hasDevice: true },
    { id: "u2", name: "PS 2", consoleType: "ps4", hourlyRate: 8000, status: "occupied", hasDevice: false },
  ],
  sessions: [
    {
      id: "srv-1",
      rentalUnitId: "u2",
      customerName: "Andi",
      startedAt: iso(-60),
      status: "running",
      pausedAt: null,
      accumulatedPauseMs: 0,
      plannedMinutes: null,
      extendedMinutes: 0,
      ratePerHour: 8000,
      promoId: null,
      promoPackagePrice: null,
      discountAmount: 0,
    },
  ],
  pricingRules: [
    { name: "Pagi", consoleType: "ps5", daysOfWeek: "wed", startTime: "09:00", endTime: "12:00", rateType: "fixed", rateValue: 10000, priority: 1 },
  ],
  promos: [{ id: "pk3", name: "Paket 3 Jam", consoleType: "any", durationMinutes: 180, packagePrice: 30000 }],
  durationPresets: [{ minutes: 60, label: "1 Jam" }],
  products: [{ id: "p-tea", name: "Es Teh", price: 5000, category: "minuman" }],
  bills: { "srv-1": { items: [{ description: "Kopi", qty: 1, lineTotal: 7000 }], paidTotal: 5000 } },
};

const base = (kind: OfflineAction["kind"], sessionId: string, minutes: number) => ({ id: id(), kind, sessionId, at: iso(minutes), clockOffsetMs: 0 });

describe("deriveLocalState", () => {
  it("starts a session offline with the same rate the server would use (pricing rules)", () => {
    const sid = id();
    const state = deriveLocalState(snapshot, [{ ...base("start", sid, 0), kind: "start", rentalUnitId: "u1", customerName: "Budi" } as OfflineAction]);
    const s = state.units.find((u) => u.id === "u1")!.session!;
    expect(s.origin).toBe("offline");
    expect(s.ratePerHour).toBe(10000); // "Pagi" rule, not the 12000 base rate
    expect(s.customerName).toBe("Budi");
  });

  it("does not start a second session on a busy unit", () => {
    const state = deriveLocalState(snapshot, [{ ...base("start", id(), 0), kind: "start", rentalUnitId: "u2" } as OfflineAction]);
    expect(state.units.find((u) => u.id === "u2")!.session!.id).toBe("srv-1");
  });

  it("tracks extend, pause/resume, F&B, stop and cash exactly like the server's charge", () => {
    const sid = id();
    const actions = [
      { ...base("start", sid, 0), kind: "start", rentalUnitId: "u1", plannedMinutes: 60 },
      { ...base("extend", sid, 30), kind: "extend", minutes: 30 },
      { ...base("pause", sid, 40), kind: "pause" },
      { ...base("resume", sid, 50), kind: "resume" },
      { ...base("addItems", sid, 55), kind: "addItems", items: [{ productId: "p-tea", qty: 2 }] },
      { ...base("stop", sid, 100), kind: "stop" },
      { ...base("payCash", sid, 101), kind: "payCash", amount: 20000 },
    ] as OfflineAction[];
    const state = deriveLocalState(snapshot, actions);
    expect(state.units.find((u) => u.id === "u1")!.session).toBeNull();
    const f = state.finished[0];
    expect(f.session.accumulatedPauseMs).toBe(10 * 60_000);
    expect(f.session.extendedMinutes).toBe(30);
    const expected = computeSessionCharge({ promo: null, plannedMinutes: 60, extendedMinutes: 30, ratePerHour: 10000, elapsedMinutes: 90, roundingMinutes: 1 });
    expect(f.estimate.rental).toBe(expected.subtotal);
    expect(f.estimate.items).toBe(10000);
    expect(f.cashPaid).toBe(20000);
  });

  it("uses the frozen package price for package sessions", () => {
    const sid = id();
    const state = deriveLocalState(snapshot, [
      { ...base("start", sid, 0), kind: "start", rentalUnitId: "u1", promoId: "pk3" },
      { ...base("stop", sid, 120), kind: "stop" },
    ] as OfflineAction[]);
    expect(state.finished[0].session.plannedMinutes).toBe(180);
    expect(state.finished[0].estimate.rental).toBe(30000);
  });

  it("keeps F&B and deposits already on the server bill of a session started before the outage", () => {
    const state = deriveLocalState(snapshot, []);
    const s = state.units.find((u) => u.id === "u2")!.session!;
    const est = estimateSession(s, 1, T0);
    expect(est.rental).toBe(8000); // 60 min × 8000/h
    expect(est.items).toBe(7000);
    expect(est.paid).toBe(5000);
    expect(est.due).toBe(10000);
  });
});
