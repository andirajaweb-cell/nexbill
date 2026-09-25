import { describe, expect, it } from "vitest";
import { roundBillTotal } from "./rounding";

describe("roundBillTotal", () => {
  it("is a no-op when rounding is off", () => {
    expect(roundBillTotal(15083, 0, "nearest")).toEqual({ total: 15083, adjustment: 0 });
    expect(roundBillTotal(15083, null, null)).toEqual({ total: 15083, adjustment: 0 });
  });

  it("rounds to the nearest unit", () => {
    expect(roundBillTotal(15083, 500, "nearest")).toEqual({ total: 15000, adjustment: -83 });
    expect(roundBillTotal(15250, 500, "nearest")).toEqual({ total: 15500, adjustment: 250 });
    expect(roundBillTotal(15083, 100, "nearest")).toEqual({ total: 15100, adjustment: 17 });
  });

  it("rounds down and up", () => {
    expect(roundBillTotal(15917, 1000, "down")).toEqual({ total: 15000, adjustment: -917 });
    expect(roundBillTotal(15083, 1000, "up")).toEqual({ total: 16000, adjustment: 917 });
  });

  it("leaves an exact multiple untouched in every mode", () => {
    for (const mode of ["nearest", "down", "up"]) expect(roundBillTotal(15000, 500, mode)).toEqual({ total: 15000, adjustment: 0 });
  });

  it("never goes negative", () => {
    expect(roundBillTotal(-50, 100, "nearest").total).toBe(0);
    expect(roundBillTotal(40, 100, "down")).toEqual({ total: 0, adjustment: -40 });
  });
});
