import { describe, expect, it } from "vitest";
import { LEAD_BASE, LEAD_CLOSED_STATUSES, LEAD_FUNNEL, LEAD_LOST_STATUSES, LEAD_STATUSES, LEAD_STATUS_LABEL, distanceKm, initialLeadStatus } from "./constants";

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
    expect(LEAD_FUNNEL).not.toContain("tutup");
    expect(LEAD_FUNNEL[0]).toBe("baru");
    expect(LEAD_FUNNEL.at(-1)).toBe("closing");
  });

  it("funnel + lost states cover every status exactly once", () => {
    expect([...LEAD_FUNNEL, ...LEAD_LOST_STATUSES].sort()).toEqual([...LEAD_STATUSES].sort());
  });
});

describe("status tutup / tidak ada", () => {
  it("is a finished status with a label", () => {
    expect(LEAD_CLOSED_STATUSES).toContain("tutup");
    expect(LEAD_STATUS_LABEL.tutup).toBe("Tutup / Tidak Ada");
  });

  it("Google Maps CLOSED_PERMANENTLY → tutup; temporarily closed / operational → baru", () => {
    expect(initialLeadStatus("CLOSED_PERMANENTLY")).toBe("tutup");
    expect(initialLeadStatus("CLOSED_TEMPORARILY")).toBe("baru");
    expect(initialLeadStatus("OPERATIONAL")).toBe("baru");
    expect(initialLeadStatus(null)).toBe("baru");
  });
});
