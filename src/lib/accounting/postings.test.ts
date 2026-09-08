import { describe, it, expect } from "vitest";
import { FNB_CATEGORIES, fnbMappingKey, merchMappingKey, rentalMappingKey } from "./postings";

/**
 * Task #63 — these three classification helpers decide which COA revenue/COGS account a line
 * item lands in (see revenueAccountIdForItem/cogsAccountIdForCategory in postings.ts). This
 * exact area caused a real bug earlier this session: lib/reports/transactions.ts kept its own
 * hand-copied F&B category list that had silently drifted to omit "coffee"/"dessert", so those
 * sales showed up as generic "Produk" on the Transaction Center page instead of "F&B", disagreeing
 * with what Accounting actually recorded. FNB_CATEGORIES is now the one canonical list every
 * caller imports — these tests exist so a future edit to that list can't silently drop a category
 * again without a test failing.
 */
describe("FNB_CATEGORIES / fnbMappingKey", () => {
  it("recognizes every category that is supposed to count as F&B", () => {
    for (const cat of ["food", "drink", "coffee", "snack", "dessert"]) {
      expect(FNB_CATEGORIES.has(cat)).toBe(true);
      expect(fnbMappingKey(cat)).toBe(cat);
    }
  });

  it("does not classify retail/merchandise categories as F&B", () => {
    expect(FNB_CATEGORIES.has("merchandise")).toBe(false);
    expect(FNB_CATEGORIES.has("accessory")).toBe(false);
    expect(fnbMappingKey("merchandise")).toBeNull();
    expect(fnbMappingKey("accessory")).toBeNull();
  });

  it("returns null for an unknown or missing category rather than guessing", () => {
    expect(fnbMappingKey("something_new")).toBeNull();
    expect(fnbMappingKey(undefined)).toBeNull();
  });
});

describe("merchMappingKey", () => {
  it("recognizes merchandise and accessory as retail-sale categories", () => {
    expect(merchMappingKey("merchandise")).toBe("merchandise");
    expect(merchMappingKey("accessory")).toBe("accessory");
  });

  it("does not classify F&B categories as retail merchandise", () => {
    expect(merchMappingKey("food")).toBeNull();
    expect(merchMappingKey("coffee")).toBeNull();
  });

  it("returns null for an unknown or missing category", () => {
    expect(merchMappingKey("raw_material")).toBeNull();
    expect(merchMappingKey(undefined)).toBeNull();
  });
});

describe("rentalMappingKey", () => {
  it("maps each known console type to its own account key", () => {
    expect(rentalMappingKey("ps3")).toBe("ps3");
    expect(rentalMappingKey("ps4")).toBe("ps4");
    expect(rentalMappingKey("ps4_pro")).toBe("ps4"); // ps4_pro shares the PS4 account, not a separate one
    expect(rentalMappingKey("ps5")).toBe("ps5");
    expect(rentalMappingKey("ps5_slim")).toBe("ps5"); // same collapsing behavior as ps4_pro
    expect(rentalMappingKey("ps6")).toBe("ps6");
  });

  it("falls back legacy/unknown console types (ps2, null, undefined) to the catch-all 'other' bucket", () => {
    expect(rentalMappingKey("ps2")).toBe("other");
    expect(rentalMappingKey(null)).toBe("other");
    expect(rentalMappingKey(undefined)).toBe("other");
    expect(rentalMappingKey("xbox")).toBe("other");
  });
});
