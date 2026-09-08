import { describe, it, expect } from "vitest";
import { glRevenueBucket } from "./transactions";

/**
 * Task #63 — glRevenueBucket is what makes Transaction Center's summary cards agree with Laba
 * Rugi (both source from the same GL now — see the fix earlier this session and the long comment
 * above this function). A wrong bucket here would reintroduce exactly the kind of Transaction
 * Center vs Accounting mismatch the user originally reported, so every account-code range it
 * claims to handle gets a pinned test.
 */
describe("glRevenueBucket", () => {
  it("buckets base and member rental revenue as rental", () => {
    expect(glRevenueBucket("4105")).toBe("rental"); // PS3
    expect(glRevenueBucket("4120")).toBe("rental"); // PS5
    expect(glRevenueBucket("4180")).toBe("rental"); // member rental
    expect(glRevenueBucket("4530")).toBe("rental"); // member add-on
  });

  it("buckets non-member add-on rental (435x) as rental, not product", () => {
    expect(glRevenueBucket("4351")).toBe("rental");
    expect(glRevenueBucket("4354")).toBe("rental");
  });

  it("buckets F&B revenue (42xx) and member F&B (4510) as fnb", () => {
    expect(glRevenueBucket("4210")).toBe("fnb"); // food
    expect(glRevenueBucket("4250")).toBe("fnb"); // dessert
    expect(glRevenueBucket("4510")).toBe("fnb"); // member F&B
  });

  it("buckets PPOB revenue (44xx) as ppob", () => {
    expect(glRevenueBucket("4410")).toBe("ppob");
    expect(glRevenueBucket("4480")).toBe("ppob");
  });

  it("buckets retail product revenue (43xx excluding 435x), member product (4520), and 46xx as product", () => {
    expect(glRevenueBucket("4310")).toBe("product"); // merchandise
    expect(glRevenueBucket("4320")).toBe("product"); // accessory
    expect(glRevenueBucket("4520")).toBe("product"); // member product
    expect(glRevenueBucket("4650")).toBe("product"); // service charge/tax catch-all
  });

  it("does NOT let 435x (add-on rental) leak into product just because it starts with 43", () => {
    expect(glRevenueBucket("4351")).not.toBe("product");
    expect(glRevenueBucket("4353")).not.toBe("product");
  });

  it("excludes Home Rental (48xx), Other Income (47xx), and Contra Revenue (49xx) as 'other'", () => {
    expect(glRevenueBucket("4830")).toBe("other"); // Home Rental PS5
    expect(glRevenueBucket("4710")).toBe("other"); // Other Income
    expect(glRevenueBucket("4910")).toBe("other"); // Diskon penjualan (contra-revenue)
  });

  it("falls back to 'other' for a code outside every known revenue range", () => {
    expect(glRevenueBucket("9999")).toBe("other");
    expect(glRevenueBucket("1112")).toBe("other"); // an asset account code, not revenue at all
  });
});
