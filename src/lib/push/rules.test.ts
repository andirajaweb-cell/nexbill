import { describe, it, expect } from "vitest";
import { effectiveCategories, allowedCategories, sanitizeCategories, renderPush, normalizeLang, isGoneStatus, PUSH_CATEGORIES } from "./rules";

describe("push categories", () => {
  it("defaults by role and never exceeds what the role allows", () => {
    expect(effectiveCategories("owner", null)).toEqual([...PUSH_CATEGORIES]);
    expect(effectiveCategories("cashier", null)).not.toContain("fraud");
    expect(effectiveCategories("cashier", '["fraud","session"]')).toEqual(["session"]);
    expect(effectiveCategories("kitchen", "garbage")).toEqual(["customer_request"]);
    expect(effectiveCategories("unknown", null)).toEqual([]);
  });
  it("an empty stored list means everything off", () => {
    expect(effectiveCategories("owner", "[]")).toEqual([]);
  });
  it("sanitizes user input against the role", () => {
    expect(sanitizeCategories("cashier", ["session", "shift_summary", 3, "session"])).toEqual(["session"]);
    expect(sanitizeCategories("owner", "nope")).toEqual([]);
    expect(allowedCategories("accountant")).toEqual(["payment", "shift_summary"]);
  });
});

describe("renderPush", () => {
  it("fills variables per language", () => {
    expect(renderPush("sessionEnding", "id", { unit: "PS 3", n: 5, customer: "Budi" })).toEqual({ title: "⏰ PS 3: sisa 5 menit", body: "Sesi Budi hampir habis." });
    expect(renderPush("sessionEnding", "en", { unit: "PS 3", n: 5 }).body).toBe("customer's session is almost over.");
    expect(renderPush("payment", "th", { method: "QRIS", amount: "Rp20.000" }).title).toContain("QRIS");
  });
  it("normalizes unknown languages to Indonesian and caps lengths", () => {
    expect(normalizeLang("de")).toBe("id");
    expect(renderPush("requestOrder", "id", { unit: "X", items: "a".repeat(400) }).body.length).toBeLessThanOrEqual(180);
  });
  it("detects expired subscriptions", () => {
    expect(isGoneStatus(410)).toBe(true);
    expect(isGoneStatus(404)).toBe(true);
    expect(isGoneStatus(500)).toBe(false);
  });
});
