import { describe, it, expect } from "vitest";
import {
  generateQrToken,
  isPlausibleToken,
  validateRequestPayload,
  canSubmitRequest,
  shouldSendTvWarning,
  clampWarningSettings,
  isTimeUpActive,
  MAX_QTY_PER_LINE,
} from "./rules";

const rnd = (seed: number) => (n: number) => Uint8Array.from({ length: n }, (_, i) => (seed * 31 + i * 17) % 256);

describe("token", () => {
  it("generates 24 base62 chars and is plausible", () => {
    const t = generateQrToken(rnd(3));
    expect(t).toMatch(/^[A-Za-z0-9]{24}$/);
    expect(isPlausibleToken(t)).toBe(true);
    expect(generateQrToken(rnd(4))).not.toBe(t);
  });
  it("rejects junk tokens", () => {
    expect(isPlausibleToken("abc")).toBe(false);
    expect(isPlausibleToken("a".repeat(20) + "'--")).toBe(false);
    expect(isPlausibleToken(null)).toBe(false);
  });
});

describe("validateRequestPayload", () => {
  it("merges duplicate products, caps qty, drops junk", () => {
    const r = validateRequestPayload("order_fnb", {
      items: [{ productId: "p1", qty: 2 }, { productId: "p1", qty: 30 }, { productId: "", qty: 1 }, { productId: "p2", qty: 0 }, "x"],
    });
    expect(r).toEqual({ ok: true, value: { items: [{ productId: "p1", qty: MAX_QTY_PER_LINE }] } });
  });
  it("requires at least one item", () => {
    expect(validateRequestPayload("order_fnb", { items: [] }).ok).toBe(false);
  });
  it("extend only allows preset minutes", () => {
    expect(validateRequestPayload("extend_time", { minutes: 60 })).toEqual({ ok: true, value: { minutes: 60 } });
    expect(validateRequestPayload("extend_time", { minutes: 999 }).ok).toBe(false);
  });
  it("call staff defaults reason and trims note", () => {
    expect(validateRequestPayload("call_staff", { reason: "hack", note: "  stik   rusak  " })).toEqual({ ok: true, value: { reason: "help", note: "stik rusak" } });
    const long = validateRequestPayload("call_staff", { reason: "bill", note: "a".repeat(500) });
    expect(long.ok && (long.value as { note: string }).note.length).toBe(140);
  });
});

describe("canSubmitRequest", () => {
  const base = { type: "order_fnb" as const, hasActiveSession: true, orderEnabled: true, extendEnabled: true, pendingCount: 0, secondsSinceLastSameType: null };
  it("allows normal case", () => expect(canSubmitRequest(base)).toEqual({ ok: true }));
  it("blocks when feature off or no session", () => {
    expect(canSubmitRequest({ ...base, orderEnabled: false }).ok).toBe(false);
    expect(canSubmitRequest({ ...base, hasActiveSession: false }).ok).toBe(false);
    expect(canSubmitRequest({ ...base, type: "call_staff", hasActiveSession: false }).ok).toBe(true);
    expect(canSubmitRequest({ ...base, type: "extend_time", extendEnabled: false }).ok).toBe(false);
  });
  it("rate limits", () => {
    expect(canSubmitRequest({ ...base, pendingCount: 5 }).ok).toBe(false);
    expect(canSubmitRequest({ ...base, secondsSinceLastSameType: 5 }).ok).toBe(false);
    expect(canSubmitRequest({ ...base, secondsSinceLastSameType: 30 }).ok).toBe(true);
  });
});

describe("tv warning", () => {
  it("fires once inside the window", () => {
    expect(shouldSendTvWarning(290, 5, false)).toBe(true);
    expect(shouldSendTvWarning(301, 5, false)).toBe(false);
    expect(shouldSendTvWarning(290, 5, true)).toBe(false);
    expect(shouldSendTvWarning(30, 5, false)).toBe(false);
    expect(shouldSendTvWarning(null, 5, false)).toBe(false);
  });
  it("clamps settings", () => {
    expect(clampWarningSettings(0, 100)).toEqual({ minutes: 1, seconds: 20 });
    expect(clampWarningSettings("x", "y")).toEqual({ minutes: 5, seconds: 7 });
  });
});

describe("isTimeUpActive", () => {
  const now = Date.parse("2026-10-03T10:00:00Z");
  const fin = { status: "finished", endedAt: "2026-10-03T09:50:00Z" };
  it("active within window when bill open", () => expect(isTimeUpActive(fin, true, false, now)).toBe(true));
  it("inactive when paid, running, old, or not finished", () => {
    expect(isTimeUpActive(fin, false, false, now)).toBe(false);
    expect(isTimeUpActive(fin, true, true, now)).toBe(false);
    expect(isTimeUpActive({ ...fin, endedAt: "2026-10-03T09:30:00Z" }, true, false, now)).toBe(false);
    expect(isTimeUpActive({ ...fin, status: "cancelled" }, true, false, now)).toBe(false);
    expect(isTimeUpActive(null, true, false, now)).toBe(false);
  });
});
