import { describe, it, expect } from "vitest";
import { periodOf, periodLabel } from "./periods";

/**
 * Task #63 — Task #62's period-locking feature lives or dies on periodOf() correctly extracting
 * "YYYY-MM" from a full ISO entryDate, since that's the exact string postJournal compares against
 * the accountingPeriods table before allowing a posting through. A wrong slice here would either
 * silently let postings through into a period that should be locked, or wrongly block postings
 * into a period that was never closed — both are the kind of bug that only surfaces at month-end,
 * so it's worth pinning down with tests rather than trusting eyeballing the slice(0, 7).
 */
describe("periodOf", () => {
  it("extracts YYYY-MM from a full ISO timestamp", () => {
    expect(periodOf("2026-08-15T10:30:00.000Z")).toBe("2026-08");
  });

  it("handles the first and last day of a month the same as any other day", () => {
    expect(periodOf("2026-08-01T00:00:00.000Z")).toBe("2026-08");
    expect(periodOf("2026-08-31T23:59:59.999Z")).toBe("2026-08");
  });

  it("distinguishes December from January across a year boundary", () => {
    expect(periodOf("2025-12-31T23:59:59.999Z")).toBe("2025-12");
    expect(periodOf("2026-01-01T00:00:00.000Z")).toBe("2026-01");
  });
});

describe("periodLabel", () => {
  it("renders a known month in Indonesian with the year", () => {
    expect(periodLabel("2026-08")).toBe("Agustus 2026");
    expect(periodLabel("2026-01")).toBe("Januari 2026");
    expect(periodLabel("2026-12")).toBe("Desember 2026");
  });

  it("falls back to the raw period string for a malformed month rather than crashing", () => {
    expect(periodLabel("2026-13")).toBe("2026-13");
    expect(periodLabel("2026-00")).toBe("2026-00");
  });
});
