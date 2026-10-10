import { describe, expect, it } from "vitest";
import { buildChecklist, type ChecklistFacts } from "./checklist";

const fresh: ChecklistFacts = {
  hasAddress: false, hasCountry: true, activeUnits: 6, zeroRateUnits: 6, configuredNonCashMethods: 0,
  staffCount: 0, controlDevices: 0, hasPrinter: false, products: 0, shifts: 0, sessions: 0,
};

describe("buildChecklist", () => {
  it("a just-registered outlet has nothing done; 4 steps are required", () => {
    const c = buildChecklist(fresh);
    expect(c.done).toBe(0);
    expect(c.requiredTotal).toBe(4);
    expect(c.allRequiredDone).toBe(false);
    expect(c.items.map((i) => i.key)).toEqual(["profile", "rates", "payments", "staff", "devices", "printer", "products", "shift", "firstSession"]);
  });

  it("rates are only done when every active unit has a price above zero", () => {
    expect(buildChecklist({ ...fresh, zeroRateUnits: 1 }).items.find((i) => i.key === "rates")?.done).toBe(false);
    expect(buildChecklist({ ...fresh, zeroRateUnits: 0 }).items.find((i) => i.key === "rates")?.done).toBe(true);
    expect(buildChecklist({ ...fresh, activeUnits: 0, zeroRateUnits: 0 }).items.find((i) => i.key === "rates")?.done).toBe(false);
  });

  it("required steps done → ready, optional steps still listed", () => {
    const c = buildChecklist({ ...fresh, hasAddress: true, zeroRateUnits: 0, shifts: 1, sessions: 3 });
    expect(c.allRequiredDone).toBe(true);
    expect(c.allDone).toBe(false);
    expect(c.done).toBe(4);
  });

  it("everything done", () => {
    const c = buildChecklist({ hasAddress: true, hasCountry: true, activeUnits: 4, zeroRateUnits: 0, configuredNonCashMethods: 1, staffCount: 2, controlDevices: 4, hasPrinter: true, products: 10, shifts: 5, sessions: 40 });
    expect(c.allDone).toBe(true);
  });
});
