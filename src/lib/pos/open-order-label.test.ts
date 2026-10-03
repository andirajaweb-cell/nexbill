import { describe, it, expect } from "vitest";
import { buildOrderTimeLabel, formatDurationShort } from "./open-order-label";

// Pakai waktu lokal (tanpa "Z") supaya hasil jam tidak bergantung zona waktu mesin uji.
describe("formatDurationShort", () => {
  it("formats hours and minutes", () => {
    expect(formatDurationShort(125 * 60000)).toBe("2j 5m");
    expect(formatDurationShort(45 * 60000)).toBe("45m");
    expect(formatDurationShort(180 * 60000)).toBe("3j");
    expect(formatDurationShort(-5)).toBe("0m");
    expect(formatDurationShort(90 * 60000, { h: "h", m: "m" })).toBe("1h 30m");
  });
});

describe("buildOrderTimeLabel", () => {
  it("same-day session", () => {
    expect(buildOrderTimeLabel("2026-10-03T14:05:00", "2026-10-03T16:10:00")).toEqual({
      date: "03/10/2026",
      timeRange: "14:05–16:10",
      duration: "2j 5m",
    });
  });
  it("crosses midnight", () => {
    expect(buildOrderTimeLabel("2026-10-03T23:30:00", "2026-10-04T01:00:00")?.timeRange).toBe("23:30–(+1) 01:00");
  });
  it("not ended yet / invalid", () => {
    expect(buildOrderTimeLabel("2026-10-03T14:05:00", null)).toEqual({ date: "03/10/2026", timeRange: "14:05", duration: "" });
    expect(buildOrderTimeLabel(null, null)).toBeNull();
    expect(buildOrderTimeLabel("bukan tanggal", null)).toBeNull();
  });
  it("respects date style", () => {
    expect(buildOrderTimeLabel("2026-10-03T14:05:00", null, { dateStyle: "iso" })?.date).toBe("2026-10-03");
  });
});
