import { describe, it, expect } from "vitest";
import { computeDemoStats } from "./demo-stats";
import { isDemoEmail } from "./demo-account";

const row = (iso: string, visitor: string, device = "Chrome · Android", country = "ID") => ({ createdAt: iso, afterData: JSON.stringify({ visitor, device, country }) });

describe("demo stats", () => {
  const now = new Date("2026-10-06T05:00:00.000Z"); // 12.00 WIB
  it("hari ini, 7 hari, 30 hari, unik", () => {
    const s = computeDemoStats(
      [
        row("2026-10-06T01:00:00.000Z", "a"),
        row("2026-10-06T02:00:00.000Z", "a"),
        row("2026-10-05T18:00:00.000Z", "b"), // 6 Okt 01.00 WIB → hari ini
        row("2026-10-05T10:00:00.000Z", "c", "Safari · iOS"), // 5 Okt WIB
        row("2026-09-20T10:00:00.000Z", "d"),
        row("2026-08-01T10:00:00.000Z", "e"), // di luar 30 hari
      ],
      now
    );
    expect(s.today).toBe(3);
    expect(s.uniqueToday).toBe(2);
    expect(s.last7Days).toBe(4);
    expect(s.last30Days).toBe(5);
    expect(s.unique30Days).toBe(4);
    expect(s.daily).toHaveLength(30);
    expect(s.daily[29]).toEqual({ date: "2026-10-06", count: 3 });
    expect(s.topDevices[0]).toEqual({ device: "Chrome · Android", count: 4 });
    expect(s.lastLoginAt).toBe("2026-10-06T02:00:00.000Z");
  });
  it("kosong", () => {
    const s = computeDemoStats([], now);
    expect(s.today).toBe(0);
    expect(s.lastLoginAt).toBeNull();
  });
  it("email demo bawaan", () => {
    expect(isDemoEmail("Demo@NexBill.id ")).toBe(true);
    expect(isDemoEmail("owner@nexbill.id")).toBe(false);
  });
});
