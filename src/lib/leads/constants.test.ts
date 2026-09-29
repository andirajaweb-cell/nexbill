import { describe, expect, it } from "vitest";
import { LEAD_BASE, LEAD_FUNNEL, distanceKm } from "./constants";

describe("distanceKm", () => {
  it("is 0 at the base itself", () => {
    expect(distanceKm(LEAD_BASE.lat, LEAD_BASE.lng)).toBe(0);
  });

  it("matches the known Majalaya → Cicalengka distance (≈7.8 km to Zona Geming)", () => {
    expect(distanceKm(-6.9970319, 107.8188504)).toBeCloseTo(7.8, 1);
  });

  it("returns null when a coordinate is missing", () => {
    expect(distanceKm(null, 107.7)).toBeNull();
    expect(distanceKm(-7.0, undefined)).toBeNull();
  });
});

describe("LEAD_FUNNEL", () => {
  it("leaves the lost state out of the funnel", () => {
    expect(LEAD_FUNNEL).not.toContain("tidak_tertarik");
    expect(LEAD_FUNNEL[0]).toBe("baru");
    expect(LEAD_FUNNEL.at(-1)).toBe("closing");
  });
});
