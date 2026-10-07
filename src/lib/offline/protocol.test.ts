import { describe, it, expect } from "vitest";
import { parseOfflineAction, checkActionTime, clockLooksTampered, OFFLINE_MAX_AGE_MS } from "./protocol";

const ID = "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed";
const SID = "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b";
const base = { id: ID, sessionId: SID, at: "2026-10-07T10:00:00.000Z", clockOffsetMs: 1200 };

describe("parseOfflineAction", () => {
  it("accepts every kind and normalizes fields", () => {
    expect(parseOfflineAction({ ...base, kind: "start", rentalUnitId: "u1", customerName: "  Budi ", plannedMinutes: 60 })).toMatchObject({ kind: "start", customerName: "Budi", plannedMinutes: 60, promoId: null });
    expect(parseOfflineAction({ ...base, kind: "extend", minutes: 30 })).toMatchObject({ kind: "extend", minutes: 30 });
    expect(parseOfflineAction({ ...base, kind: "pause" }).kind).toBe("pause");
    expect(parseOfflineAction({ ...base, kind: "addItems", items: [{ productId: "p1", qty: 2 }] })).toMatchObject({ items: [{ productId: "p1", qty: 2 }] });
    expect(parseOfflineAction({ ...base, kind: "payCash", amount: 15000.004 })).toMatchObject({ amount: 15000 });
  });

  it("rejects malformed actions", () => {
    expect(() => parseOfflineAction({ ...base, id: "not-a-uuid", kind: "stop" })).toThrow();
    expect(() => parseOfflineAction({ ...base, kind: "extend", minutes: -5 })).toThrow();
    expect(() => parseOfflineAction({ ...base, kind: "payCash", amount: 0 })).toThrow();
    expect(() => parseOfflineAction({ ...base, kind: "addItems", items: [] })).toThrow();
    expect(() => parseOfflineAction({ ...base, kind: "start" })).toThrow();
    expect(() => parseOfflineAction({ ...base, kind: "delete-everything" })).toThrow();
    expect(() => parseOfflineAction({ ...base, at: "kemarin", kind: "stop" })).toThrow();
  });
});

describe("time checks", () => {
  const now = Date.parse("2026-10-07T12:00:00.000Z");
  it("accepts recent actions, rejects future and too-old ones", () => {
    expect(checkActionTime("2026-10-07T11:00:00.000Z", now)).toBeNull();
    expect(checkActionTime("2026-10-07T12:03:00.000Z", now)).toBeNull(); // within skew
    expect(checkActionTime("2026-10-07T12:30:00.000Z", now)).toMatch(/masa depan/);
    expect(checkActionTime(new Date(now - OFFLINE_MAX_AGE_MS - 1000).toISOString(), now)).toMatch(/72 jam/);
  });
  it("flags a device clock changed while offline", () => {
    expect(clockLooksTampered(1000, 1500)).toBe(false);
    expect(clockLooksTampered(1000, 1000 + 60 * 60 * 1000)).toBe(true);
  });
});
