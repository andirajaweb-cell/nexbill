import { describe, it, expect } from "vitest";
import { latestBulkPauseGroup } from "./bulk-pause";

describe("latestBulkPauseGroup", () => {
  const T1 = "2026-10-12T10:00:00.000Z";
  const T2 = "2026-10-12T11:00:00.000Z";
  it("finds sessions paused together with the same timestamp", () => {
    const g = latestBulkPauseGroup([
      { id: "a", status: "paused", pausedAt: T1 },
      { id: "b", status: "paused", pausedAt: T1 },
      { id: "c", status: "running", pausedAt: null },
    ]);
    expect(g).toEqual({ pausedAt: T1, sessionIds: ["a", "b"] });
  });

  it("ignores a single manually paused session unless this device remembers the bulk stamp", () => {
    const one = [{ id: "a", status: "paused", pausedAt: T1 }];
    expect(latestBulkPauseGroup(one)).toBeNull();
    expect(latestBulkPauseGroup(one, T1)).toEqual({ pausedAt: T1, sessionIds: ["a"] });
  });

  it("picks the most recent group", () => {
    const g = latestBulkPauseGroup([
      { id: "a", status: "paused", pausedAt: T1 },
      { id: "b", status: "paused", pausedAt: T1 },
      { id: "c", status: "paused", pausedAt: T2 },
      { id: "d", status: "paused", pausedAt: T2 },
    ]);
    expect(g?.pausedAt).toBe(T2);
  });
});
