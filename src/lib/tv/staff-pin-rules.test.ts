import { describe, expect, it } from "vitest";
import { canHaveTvPin, runsByStaff, validateTvPin } from "./staff-pin-rules";

describe("PIN per staf NEXBILL TV", () => {
  it("PIN 4–6 digit, bukan sama semua / berurutan", () => {
    expect(validateTvPin("4821")).toBeNull();
    expect(validateTvPin("903172")).toBeNull();
    expect(validateTvPin("123")).toMatch(/4–6/);
    expect(validateTvPin("12a4")).toMatch(/4–6/);
    expect(validateTvPin("0000")).toMatch(/sama/);
    expect(validateTvPin("1234")).toMatch(/berurutan/);
    expect(validateTvPin("8901")).toMatch(/berurutan/);
    expect(validateTvPin("6543")).toMatch(/berurutan/);
    expect(validateTvPin(1234)).toMatch(/4–6/);
  });
  it("peran yang boleh: kasir s.d. owner; dapur & akuntan tidak", () => {
    expect(canHaveTvPin("cashier")).toBe(true);
    expect(canHaveTvPin("owner")).toBe(true);
    expect(canHaveTvPin("kitchen")).toBe(false);
    expect(canHaveTvPin("accountant")).toBe(false);
  });
  it("antrean dipecah per rangkaian staf tanpa mengubah urutan", () => {
    const items = [
      { id: 1, s: "A" },
      { id: 2, s: "A" },
      { id: 3, s: "B" },
      { id: 4, s: "A" },
    ];
    expect(runsByStaff(items, (i) => i.s).map((r) => [r.staffId, r.items.map((i) => i.id)])).toEqual([
      ["A", [1, 2]],
      ["B", [3]],
      ["A", [4]],
    ]);
  });
});
