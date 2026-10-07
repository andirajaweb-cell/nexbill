import { describe, expect, it } from "vitest";
import { computePanelPosition, isTriggerOffscreen } from "./searchable-select-position";

const phone = { layoutHeight: 800, visibleHeight: 800, width: 390 };
const phoneKeyboard = { layoutHeight: 800, visibleHeight: 450, width: 390 };

describe("computePanelPosition", () => {
  it("opens below the trigger when there is room", () => {
    const p = computePanelPosition({ top: 100, bottom: 140, left: 16, width: 300 }, phone);
    expect(p.top).toBe(144);
    expect(p.bottom).toBeUndefined();
    expect(p.listMaxHeight).toBe(224);
  });

  it("flips above when the soft keyboard leaves no room below", () => {
    const p = computePanelPosition({ top: 380, bottom: 420, left: 16, width: 300 }, phoneKeyboard);
    expect(p.top).toBeUndefined();
    expect(p.bottom).toBe(800 - 380 + 4);
    expect(p.listMaxHeight).toBeLessThanOrEqual(224);
    expect(p.listMaxHeight).toBeGreaterThanOrEqual(96);
  });

  it("shrinks the option list to the visible space instead of running under the keyboard", () => {
    const p = computePanelPosition({ top: 60, bottom: 100, left: 16, width: 300 }, { ...phoneKeyboard, visibleHeight: 300 });
    // below: 300-100-12 = 188 room → list 136; above: 48 → stays below
    expect(p.top).toBe(104);
    expect(p.listMaxHeight).toBe(136);
  });

  it("keeps a min-width panel inside the screen near the right edge", () => {
    const p = computePanelPosition({ top: 100, bottom: 140, left: 300, width: 80 }, phone);
    expect(p.width).toBe(220);
    expect(p.left + p.width).toBeLessThanOrEqual(390 - 8);
    expect(p.left).toBeGreaterThanOrEqual(8);
  });

  it("never makes the panel wider than the screen", () => {
    const p = computePanelPosition({ top: 100, bottom: 140, left: 0, width: 600 }, { layoutHeight: 800, visibleHeight: 800, width: 320 });
    expect(p.width).toBe(304);
    expect(p.left).toBe(8);
  });
});

describe("isTriggerOffscreen", () => {
  it("is false while the trigger is visible (e.g. after the keyboard scrolled the page a bit)", () => {
    expect(isTriggerOffscreen({ top: 200, bottom: 240, left: 0, width: 100 }, phoneKeyboard)).toBe(false);
  });
  it("is true once the trigger scrolled out of view", () => {
    expect(isTriggerOffscreen({ top: -60, bottom: -20, left: 0, width: 100 }, phone)).toBe(true);
    expect(isTriggerOffscreen({ top: 460, bottom: 500, left: 0, width: 100 }, phoneKeyboard)).toBe(true);
  });
});
