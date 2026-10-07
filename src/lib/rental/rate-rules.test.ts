import { describe, it, expect } from "vitest";
import { pickPricingRule, ruleRateFor, ruleMatchesNow } from "./rate-rules";

const rule = (over: Partial<Parameters<typeof ruleRateFor>[1] & object> = {}) => ({
  name: "Happy hour",
  consoleType: "any",
  daysOfWeek: "mon,tue,wed,thu,fri",
  startTime: "13:00",
  endTime: "16:00",
  rateType: "multiplier" as const,
  rateValue: 0.8,
  priority: 1,
  ...over,
});

describe("rate rules (shared by server pricing and Mode Offline)", () => {
  // 2026-10-07 is a Wednesday; 07:00 UTC = 14:00 WIB.
  const wed14 = new Date("2026-10-07T07:00:00.000Z");
  it("applies the highest-priority matching rule in outlet time", () => {
    const night = rule({ name: "Malam", startTime: "22:00", endTime: "02:00", rateType: "fixed", rateValue: 5000, priority: 5 });
    const best = pickPricingRule({ consoleType: "ps5" }, [rule(), night], wed14);
    expect(best?.name).toBe("Happy hour");
    expect(ruleRateFor(10000, best)).toBe(8000);
  });
  it("respects console scope and inactive rules", () => {
    expect(pickPricingRule({ consoleType: "ps4" }, [rule({ consoleType: "ps5" })], wed14)).toBeNull();
    expect(pickPricingRule({ consoleType: "ps5" }, [rule({ isActive: false })], wed14)).toBeNull();
    expect(ruleRateFor(10000, null)).toBe(10000);
  });
  it("handles overnight windows", () => {
    expect(ruleMatchesNow({ daysOfWeek: "fri", startTime: "22:00", endTime: "02:00" }, "sat", "fri", "01:30")).toBe(true);
    expect(ruleMatchesNow({ daysOfWeek: "fri", startTime: "22:00", endTime: "02:00" }, "sat", "fri", "03:00")).toBe(false);
  });
});
